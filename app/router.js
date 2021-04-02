module.exports = app => {
  const {io, router, controller, middleware} = app
  const authUser = middleware.auth({target:'user'},app)
  const authAdmin = middleware.auth({target:'admin'},app)

  const {
    common,
    user,
    article,
    tag,
  } = controller

  router
    //common
    .get('/', common.hello)
    .get('/gt3', common.gtRegister)
    .post('/getCode', common.getCode)
    .post('/sendEmail', common.sendEmail)
    .post('/uploadFile', common.uploadFile)
    //user
    .post('/user', user.register)
    .post('/user/login', user.login)
    .post('/user/logout', authUser, user.logout)
    .post('/user/resetPassword', authUser, user.resetPassword)
    .patch('/user/:id', authUser, user.patchUserInfo)
    .delete('/user/:username', authAdmin, user.deleteUser)
    .get('/user/:token', user.getUserInfoByToken)
    .get('/user', user.getUserInfoById)
    .get('/users', user.listUser)
    //article
    .post('/article', article.createArticle)
    .patch('/article/:id', article.updateArticle)
    .delete('/article/:id', article.delArticle)
    .get('/article/:id', article.getArticle)
    .get('/articles', article.listArticle)
    .get('/articles/search/:keyword', article.listArticleBySearch)
    .get('/articles/tag/:tag', article.listArticleByTag)
    .get('/articles/tagId/:tagId', article.listArticleByTagId)
    //tag
    .get('/tags', tag.listTag)

  io.of('/')
    .route('exchange', io.controller.nsp.exchange)
};
