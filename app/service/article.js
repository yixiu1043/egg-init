const promiseAsync = require('promise-async')
const {pagination,list} = require('../extend/utils')

const Service = require('egg').Service
class ArticleService extends Service {
  /**
   * @api {post} /article 01.新增文章
   * @apiSampleRequest /article
   * @apiName createArticle
   * @apiGroup Article
   * @apiPermission 登录用户
   * @apiVersion 0.1.0
   *
   * @apiParam {Array} tags   标签
   * @apiParam {String} user  用户id
   *
   * @apiUse success
   * @apiUse error
   */
  async createArticle() {
    const {ctx} = this
    const body = ctx.request.body
    const {Tag,Article} = ctx.model
    const {tags,user} = body

    if(!tags || !user) ctx.throw('缺少字段')

    body.tags = []
    await promiseAsync.each(tags,async (item,callback) => {
      let tag = await Tag.findOneAndUpdate({name: item},{name: item},{new: true,upsert: true,setDefaultsOnInsert:true})
      body.tags.push(tag._id)
      callback() //important
    })

    await Article.create(body)

    return{
      type: 'success'
    }
  }
  /**
   * @api {get} /article/:id 02.获取文章
   * @apiSampleRequest /article/:id
   * @apiName getArticle
   * @apiGroup Article
   * @apiPermission none
   * @apiVersion 0.1.0
   *
   * @apiUse data
   * @apiUse error
   */
  async getArticle() {
    const {ctx} = this
    const {id} = ctx.params
    const {Article} = ctx.model

    let record = await Article.findById(id)
      .populate({
        path:'tags',
        select: 'name'
      })
      .populate({
        path:'user',
        select: 'name'
      })

    await Article.findByIdAndUpdate(id,{view:record.view + 1})

    let preArticle = await Article.find({ 'createdAt': { '$lt': record.createdAt } })
      .select('title')
      .sort({_id: -1})
      .limit(1)
    let nextArticle = await Article.find({ 'createdAt': { '$gt': record.createdAt } })
      .select('title')
      .sort({_id: 1})
      .limit(1)

    let temp = {}
    let pre = preArticle[0] ? preArticle[0] : {}
    let next = nextArticle[0] ? nextArticle[0] : {}

    let result = Object.assign(temp,record._doc,{pre},{next})

    return{
      type: 'data',
      data: result
    }
  }
  /**
   * @api {patch} /article/:id 03.修改文章
   * @apiSampleRequest /article/:id
   * @apiName updateArticle
   * @apiGroup Article
   * @apiPermission 登录用户
   * @apiVersion 0.1.0
   *
   * @apiUse ParamArticleModel
   *
   * @apiUse success
   * @apiUse error
   */
  async updateArticle() {
    const {ctx} = this
    const body = ctx.request.body
    const {user,tags} = body
    const {id} = ctx.params
    const {Tag,Article} = ctx.model

    if(user) ctx.throw('禁止修改字段')

    body.tags = []
    await promiseAsync.each(tags,async (item,callback) => {
      let tag = await Tag.findOneAndUpdate({name: item},{name: item},{new: true,upsert: true,setDefaultsOnInsert:true})
      body.tags.push(tag._id)
      callback()
    })

    body.updatedAt = Date.now()
    let res = await Article.findByIdAndUpdate(id,body)
    if(!res) ctx.throw('无记录')

    return{
      type: 'success'
    }
  }
  /**
   * @api {delete} /article/:id 04.删除文章
   * @apiSampleRequest /article/:id
   * @apiName deleteArticle
   * @apiGroup Article
   * @apiPermission 登录用户
   * @apiVersion 0.1.0
   *
   * @apiUse success
   * @apiUse error
   */
  async delArticle() {
    const {ctx} = this
    const {id} = ctx.params
    const {Article} = ctx.model

    let res = await Article.findByIdAndDelete(id)
    if(!res) ctx.throw('无记录')

    return{
      type: 'success'
    }
  }
  /**
   * @api {get} /articles 05.获取文章列表
   * @apiSampleRequest /articles
   * @apiName listArticle
   * @apiGroup Article
   * @apiPermission none
   * @apiVersion 0.1.0
   *
   * @apiUse dataArr
   * @apiUse error
   */
  async listArticle() {
    const {ctx} = this
    const page = pagination(ctx)
    const {Article} = ctx.model

    const count = await Article.countDocuments(page.query)
    const records = await Article.find(page.query)
      .sort(page.sort)
      .skip(page.skip)
      .limit(page.limit)
      .populate({
        path:'user',
        select: 'name'
      })
      .populate({
        path:'tags',
        select: 'name'
      })

    return{
      type: 'data',
      data: records,
      total: count
    }
  }
  /**
   * @api {get} /articles/search/:keyword 06.通过搜索获取文章列表
   * @apiSampleRequest /articles/search/:keyword
   * @apiName listArticleBySearch
   * @apiGroup Article
   * @apiPermission none
   * @apiVersion 0.1.0
   *
   * @apiUse dataArr
   * @apiUse error
   */
  async listArticleBySearch() {
    const {ctx} = this
    const page = pagination(ctx)
    const { keyword } = ctx.params
    const { Article } = ctx.model
    const reg = new RegExp(decodeURIComponent(keyword), 'i')
    const conditions = {$or: [{ title: { $regex: reg } }, { content: { $regex: reg } }]}

    let count = await Article.count(conditions)
    let records = await Article.find(conditions)
      .sort(page.sort)
      .skip(page.skip)
      .limit(page.limit)
      .populate({
        path:'user',
        select: 'name'
      })
      .populate({
        path:'tags',
        select: 'name'
      })

    return{
      type: 'data',
      data: records,
      total: count
    }
  }
  /**
   * @api {get} /articles/tag/:tag 07.通过标签名称获取文章列表
   * @apiSampleRequest /articles/tag/:tag
   * @apiName listArticleByTag
   * @apiGroup Article
   * @apiPermission none
   * @apiVersion 0.1.0
   *
   * @apiUse dataArr
   * @apiUse error
   */
  async listArticleByTag() {
    const {ctx} = this
    const page = pagination(ctx)
    const { tag } = ctx.params
    const { Tag,Article } = ctx.model

    let record = await Tag.find({name: tag})
    if(!record[0]) return{type:'message',message:'无记录'}

    let conditions = { tags: {$all:[record[0]._id]} }
    let count = await Article.countDocuments(Object.assign(conditions,page.query))
    let records = await Article.find(Object.assign(conditions,page.query))
      .sort(page.sort)
      .skip(page.skip)
      .limit(page.limit)
      .populate({
        path:'user',
        select: 'name'
      })
      .populate({
        path:'tags',
        select: 'name'
      })

    return{
      type: 'data',
      data: records,
      total: count
    }

  }
  /**
   * @api {get} /articles/tagId/:tagId 08.通过标签id获取文章列表
   * @apiSampleRequest /articles/tagId/:tagId
   * @apiName listArticleByTagId
   * @apiGroup Article
   * @apiPermission none
   * @apiVersion 0.1.0
   *
   * @apiUse dataArr
   * @apiUse error
   */
  async listArticleByTagId() {
    const {ctx} = this
    const page = pagination(ctx)
    const { tagId } = ctx.params
    const { Article } = ctx.model
    const conditions = { tags: {$all:[tagId]} }

    let count = await Article.countDocuments(Object.assign(conditions,page.query))
    let records = await Article.find(Object.assign(conditions,page.query))
      .sort(page.sort)
      .skip(page.skip)
      .limit(page.limit)
      .populate({
        path:'user',
        select: 'name'
      })
      .populate({
        path:'tags',
        select: 'name'
      })

    return{
      type: 'data',
      data: records,
      total: count
    }
  }
}

module.exports = ArticleService
