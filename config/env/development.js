module.exports = {
  hostName: 'https://travelerbackend.herokuapp.com',
  devMode: true,
  portNum: -1,
  enforceSSL: false,
  showErrorStacktrace: true,
  sendEmail: true,
  logLevel: 'debug',
  enableBungieIntegration: process.env.enableBungieIntegration|| false
}