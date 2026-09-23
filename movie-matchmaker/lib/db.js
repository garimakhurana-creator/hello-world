const { createClient } = require('@supabase/supabase-js');

let client = null;

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. Add them to movie-matchmaker/.env.');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

async function insertOne(table, row) {
  const { data, error } = await getClient().from(table).insert(row).select().single();
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
  return data;
}

async function updateOne(table, match, patch) {
  const { data, error } = await getClient().from(table).update(patch).match(match).select();
  if (error) throw new Error(`${table} update failed: ${error.message}`);
  return data;
}

async function getOne(table, match) {
  const { data, error } = await getClient().from(table).select('*').match(match).maybeSingle();
  if (error) throw new Error(`${table} select failed: ${error.message}`);
  return data;
}

async function getMany(table, match, opts) {
  let query = getClient().from(table).select('*').match(match || {});
  if (opts && opts.orderBy) query = query.order(opts.orderBy, { ascending: opts.ascending !== false });
  const { data, error } = await query;
  if (error) throw new Error(`${table} select failed: ${error.message}`);
  return data;
}

async function getManyIn(table, column, values, match) {
  if (!values.length) return [];
  let query = getClient().from(table).select('*').in(column, values);
  if (match) query = query.match(match);
  const { data, error } = await query;
  if (error) throw new Error(`${table} select failed: ${error.message}`);
  return data;
}

module.exports = { getClient, insertOne, updateOne, getOne, getMany, getManyIn };
