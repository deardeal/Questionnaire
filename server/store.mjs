export function makeStore(pool){
 return {
  query:(sql,params=[])=>pool.query(sql,params),
  async transaction(fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 };
}
