const PREFIX = 'room';
module.exports = () => {
  return async (ctx, next) => {
    const { app, socket, logger, helper } = ctx
    const id = socket.id;
    const nsp = app.io.of('/');
    console.log('--------------------------------------')
    const query = socket.handshake.query;

    // 用户信息
    const { room, userId } = query;
    const rooms = [ room ];
    console.log('#user_info', id, room, userId);


    const tick = (id, msg) => {
      logger.debug('#tick', id, msg);

      // 踢出用户前发送消息
      socket.emit(id, helper.parseMsg('deny', msg));

      console.log(Object.keys(nsp.adapter))
      // 调用 adapter 方法踢出用户，客户端触发 disconnect 事件
      nsp.adapter.remoteDisconnect(id, true, err => {
        logger.error(err);
      });
    };

    const hasRoom = await app.redis.get(`${PREFIX}:${room}`)
    console.log('#has_exist', hasRoom)

    if (!hasRoom) {
      tick(id, {
        type: 'deleted',
        message: 'deleted, room has been deleted.',
      });
      return;
    }

    // 用户加入
    socket.join(room)
    console.log('#join', room)

    // // 在线列表
    nsp.adapter.clients(rooms, (err, clients) => {
      console.log('#online_join', clients);

      // 更新在线用户列表
      nsp.to(room).emit('online', {
        clients,
        action: 'join',
        target: 'participator',
        message: `User(${id}) joined.`,
      });
    });

    await next();

    console.log('#leave', room)

    nsp.adapter.clients(rooms, (err, clients) => {
      logger.debug('#online_leave', clients);

      // 获取 client 信息
      // const clientsDetail = {};
      // clients.forEach(client => {
      //   const _client = app.io.sockets.sockets[client];
      //   const _query = _client.handshake.query;
      //   clientsDetail[client] = _query;
      // });

      // 更新在线用户列表
      nsp.to(room).emit('online', {
        clients,
        action: 'leave',
        target: 'participator',
        message: `User(${id}) leaved.`,
      });
    });
  }
};
