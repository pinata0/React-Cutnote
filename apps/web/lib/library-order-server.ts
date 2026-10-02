import {database} from './server';
import {emptyLibraryOrder,type OrderScope,type LibraryOrder} from '../features/library/library-order';
export async function readLibraryOrder():Promise<LibraryOrder>{
 const result=await database().prepare('SELECT scope,ordered_keys,revision FROM library_order').all<{scope:OrderScope;ordered_keys:string;revision:number}>();
 const order=emptyLibraryOrder();for(const row of result.results)if(row.scope in order)order[row.scope]={keys:JSON.parse(row.ordered_keys),revision:row.revision};return order;
}
