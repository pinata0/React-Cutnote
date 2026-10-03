import java.nio.file.*;
import java.util.*;
import javax.tools.*;
import com.sun.source.tree.*;
import com.sun.source.util.*;

// Parse source only: Android classes need not resolve and no application runs.
public class JavaDeclarations {
  static String quote(String s) {
    return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
  }
  public static void main(String[] args) throws Exception {
    var compiler = ToolProvider.getSystemJavaCompiler();
    var diagnostics = new DiagnosticCollector<JavaFileObject>();
    try (var files = compiler.getStandardFileManager(diagnostics, null, java.nio.charset.StandardCharsets.UTF_8)) {
      var task = (JavacTask) compiler.getTask(null, files, diagnostics, List.of("-proc:none"), null, files.getJavaFileObjectsFromStrings(List.of(args)));
      var trees = Trees.instance(task);
      for (var unit : task.parse()) {
        String file = Path.of(unit.getSourceFile().toUri()).toAbsolutePath().normalize().toString();
        new TreePathScanner<Void, Void>() {
          Deque<String> owners = new ArrayDeque<>();
          void emit(Tree node, String name, String kind, String detail) {
            long pos = trees.getSourcePositions().getStartPosition(unit, node);
            System.out.println("{\"file\":" + quote(file) + ",\"line\":" + unit.getLineMap().getLineNumber(pos)
              + ",\"name\":" + quote(String.join(".", owners) + (owners.isEmpty() ? "" : ".") + name)
              + ",\"kind\":" + quote(kind) + ",\"detail\":" + quote(detail)
              + ",\"module\":" + quote(String.valueOf(unit.getPackageName())) + "}");
          }
          @Override public Void visitClass(ClassTree node, Void p) {
            String name = node.getSimpleName().toString();
            if (name.isEmpty()) name = "anonymous@" + unit.getLineMap().getLineNumber(trees.getSourcePositions().getStartPosition(unit, node));
            emit(node, name, "Java " + node.getKind(), node.getExtendsClause() == null ? "" : "extends " + node.getExtendsClause());
            owners.addLast(name); super.visitClass(node, p); owners.removeLast(); return null;
          }
          @Override public Void visitMethod(MethodTree node, Void p) {
            emit(node, node.getName().toString(), "Java method", node.getModifiers() + " " + node.getReturnType() + " (" + node.getParameters().stream().map(x -> x.getType().toString()).reduce((a,b)->a+", "+b).orElse("") + ")");
            return super.visitMethod(node, p);
          }
          @Override public Void visitVariable(VariableTree node, Void p) {
            if (getCurrentPath().getParentPath().getLeaf() instanceof ClassTree)
              emit(node, node.getName().toString(), "Java field", node.getModifiers() + " " + node.getType());
            return super.visitVariable(node, p);
          }
        }.scan(unit, null);
      }
    }
    if (diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR))
      throw new IllegalStateException("Java parse errors; source content withheld");
  }
}
