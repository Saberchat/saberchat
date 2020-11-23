const net = require('net')

let status = {
    failed : {status : "failed",message : "Email doesn't exists"},
    success:{status : "success",message: "Email exists"},
    error : {status: "Error", message : "Email syntax error"}
}
module.exports = async(payloadData)=>{
  return await new Promise((resolve, reject)=>{
    try {
          const commands = [
            'HELO gmail\r\n',
            'MAIL FROM: <emailchecknpm@gmail.com>\r\n',
            `RCPT TO: <${payloadData}>\r\n`,
            'DATA\r\n',
            `FROM: <emailchecknpm@gmail.com>\r\nTO: <${payloadData}>\r\nSUBJECT: Email Testing\r\nTesting the existence of an email address!\r\n.\r\n`,
            'QUIT\r\n'
            ]
          let i = 0
          let count = 0
          const socket = net.createConnection(25, 'gmail-smtp-in.l.google.com');
            socket.on('data', buff => {
            const result = buff.toString()
              if(result.includes('550-5.1.1')){
                  resolve(status.failed);
                  socket.destroy();
              }else if(result.includes('555 5.5.2')){
                resolve(status.error);
                socket.destroy();
              }else if(result.includes('221 2.0.0 closing connection')) {
                  socket.end();
              }else if(i < commands.length) {
                  socket.write(commands[++i]);
                  count += 1;
                    if(count > 3){resolve(status.success); socket.destroy()}
              }else{
                  resolve('Cannot Connect to server');
                  socket.destroy()
              }
            })
          socket.write(commands[i])
    } catch (error) {
        reject(error);
    }        
  })
}
