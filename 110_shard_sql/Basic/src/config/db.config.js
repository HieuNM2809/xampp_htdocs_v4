module.exports = {
  shards: [
    {
      host: 'mysql-shard1',
      user: 'user',
      password: 'password',
      database: 'shard1',
      port: 3306,
      connectionLimit: 10
    },
    {
      host: 'mysql-shard2',
      user: 'user',
      password: 'password',
      database: 'shard2',
      port: 3306,
      connectionLimit: 10
    }
  ]
};
