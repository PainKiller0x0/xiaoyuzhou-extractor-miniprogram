// app.js
App({
  onLaunch() {
    // 初始化云开发
    // 这段代码确保小程序启动时就连接到你的云开发环境
    wx.cloud.init({
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入你的云开发环境 ID
      env: 'cloud1-9gn65dmbdee851dc', // <<<--- 把这里替换成你刚刚复制的环境 ID
      traceUser: true, // 在云开发控制台追踪用户访问记录，方便调试
    })
  }
})