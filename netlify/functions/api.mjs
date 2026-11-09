import {getDatabase} from '@netlify/database';
import {makeStore} from '../../server/store.mjs';
import {createApi} from '../../server/api.mjs';
export default async (request,context)=>{
 const db=getDatabase();
 return createApi({store:makeStore(db.pool),env:process.env})(request,{ip:context.ip||'unknown'});
};
export const config={path:'/api/*'};
