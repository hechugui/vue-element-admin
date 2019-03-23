import router from './router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css'// progress bar style
import { getToken } from '@/utils/auth' // getToken from cookie

NProgress.configure({ showSpinner: false })// NProgress Configuration

// permission judge function
function hasPermission(roles, permissionRoles) {
  if (roles.indexOf('admin') >= 0) return true // super admin really work!
  if (!permissionRoles) return true//就是这个页面根本就没有身份要求
  return roles.some(role => permissionRoles.indexOf(role) >= 0)
}

const whiteList = ['/login', '/auth-redirect']// no redirect whitelist


router.beforeEach((to, from, next) => {
  NProgress.start() // start progress bar
  if (getToken()) { // determine if there has token
    /* has token*/
    if (to.path === '/login') {
      //有tiken ,如果是去login 的
      next({ path: '/' })
      //立即重定向到首页，不让他添乱
      NProgress.done() // if current page is dashboard will not trigger	afterEach hook, so manually handle it
    } else {
      //有token ，不去 login
      if (store.getters.roles.length === 0) { // 判断当前用户是否已拉取完user_info信息
        //===0 是没有拿到 user-info
        store.dispatch('GetUserInfo').then(res => { // 拉取user_info
          const roles = res.data.roles
          //身份！
          // note: roles must be a array! such as: ['editor','develop']
          store.dispatch('GenerateRoutes', { roles }).then(() => {


            //拿着身份们，去调用 generateroutes 方法，生成路由表！

            // 根据roles权限生成可访问的路由表
            router.addRoutes(store.getters.addRouters)
            //（）里去 state.permission.addrouters



            // 动态添加可访问路由表
            next({ ...to, replace: true }) // hack方法 确保addRoutes已完成 ,set the replace: true so the navigation will not leave a history record
          })
        }).catch((err) => {
          store.dispatch('FedLogOut').then(() => {
            Message.error(err)
            next({ path: '/' })
          })
        })
      } else {
        // 没有动态改变权限的需求可直接next() 删除下方权限判断 ↓
        if (hasPermission(store.getters.roles, to.meta.roles)) {
          next()
        } else {
          next({ path: '/401', replace: true, query: { noGoBack: true }})
        }
        // 可删 ↑
      }
    }
  } else {
    /* has no token*/
    if (whiteList.indexOf(to.path) !== -1) { // 在免登录白名单，直接进入
      next()
    } else {
      next(`/login?redirect=${to.path}`) // 否则全部重定向到登录页,超级科学
      NProgress.done() // if current page is login will not trigger afterEach hook, so manually handle it
    }
  }
})

router.afterEach(() => {
  NProgress.done() // finish progress bar
})
