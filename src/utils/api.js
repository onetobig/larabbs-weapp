import wepy from 'wepy'

const host = 'http://larabbs.test/api'

// 普通请求
const request = async (options, showLoading = true) => {
    if (typeof options === 'string') {
        options = {
            url: options
        }
    }

    // 显示加载中
    if (showLoading) {
        wepy.showLoading({title: '加载中'})
    }

    // 拼接请求地址
    options.url = host + '/' + options.url
    // 调用小程序的 request 方法
    let response = await wepy.request(options)

    if (showLoading) {
        // 隐藏加载中
        wepy.hideLoading()
    }

    // 服务器异常后给予提示
    if (response.statusCode === 500) {
        wepy.showModel({
            title:  '提示',
            content: '服务器错误，请联系管理员或重试'
        })
    }

    return response
}

// 登录
const login = async (params = {}) => {
    // code 只能使用一次，所以每次单独调用
    let loginData = await wepy.login()

    // 参数中增加code
    params.code = loginData.code

    // 接口请求 weapp/authorizations
    let authResponse = await request({
        url: 'weapp/authorizations',
        data: params,
        method: 'POST'
    })

    // 登录成功，记录 token 信息
    if (authResponse.statusCode === 201) {
        wepy.setStorageSync('access_token', authResponse.data.access_token)
        wepy.setStorageSync('access_token_expired_at', new Date().getTime() + authResponse.data.expires_in * 1000)
    }

    return authResponse
}

  // 请求刷新接口
const refreshToken = async (accessToken) => {
  let refreshResponse = await wepy.request({
    url: host + '/' + 'authorizations/current',
    method: 'PUT',
    header: {
      'Authorization': 'Bearer ' + accessToken
    }
  })

  if (refreshResponse.statusCode === 200) {
    wepy.setStorageSync('access_token', refreshResponse.data.access_token)
    wepy.setStorageSync('access_token_expired_at', new Date().getTime() + refreshResponse.data.expires_in * 1000)
  }

  return refreshResponse;
}

// 获取 Token
const getToken = async (options) => {
  // 从缓存中取出 token
  let accessToken = wepy.getStorageSync('access_token')
  let expiredAt = wepy.getStorageSync('access_token_expired_at')

  // 过期调用刷新方法
  if (accessToken && new Date().getTime() > expiredAt) {
    let refreshResponse = await refreshToken(accessToken)

    // 刷新成功
    if (refreshResponse.statusCode === 200) {
      accessToken = refreshResponse.data.access_token
    } else {
      // 刷新失败
      let authResponse = await login()
      if (authResponse.statusCode === 201) {
        accessToken = authResponse.data.access_token
      }
    }
  }
  return accessToken
}

//  带身份认证的请求
const authRequest = async (options, showLoading = true) => {
  if (typeof options === 'string') {
    options = {
      url: options
    }
  }

  let accessToken = await getToken();

  let header = options.header || {}
  header.Authorization = 'Bearer ' + accessToken
  options.header = header
  return request(options, showLoading)
}

const logout = async (params = {}) => {
  let accessToken = wepy.getStorageSync('access_token')

  // 调用删除 Token 接口
  let logoutResponse = await authRequest({
    url: 'authorizations/current',
    method: 'DELETE'
  })
  // 调用接口成功则清空缓存
  if (logoutResponse.statusCode === 204) {
    wepy.clearStorage()
  }
  return logoutResponse
}

const showErrorModal = async (err) => {
  console.log(err)
  wepy.showModal({
    title: '提示',
    content: '服务器错误，请联系管理员'
  })
}

export default {
    request,
    login,
    refreshToken,
    getToken,
    authRequest,
    logout,
    showErrorModal
}
