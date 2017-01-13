var uuid = require('uuid')

function getRandomUUID(){
/*
  var token = uuid.v1({
    node: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab],
    clockseq: 0x1234,
    msecs: new Date().getMilliseconds()
  });

  return token;
*/
  return uuid.v4()
}

module.exports={
  getRandomUUID:getRandomUUID
}