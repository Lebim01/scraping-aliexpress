const scrape = require('aliexpress-product-scraper');
const WebSocketServer = require('websocket').server;
const http = require('http');

process.setMaxListeners(0);

let last_pid = 0
 
const server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});
 
wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection accepted.');

    const connection = request.accept()

    connection.protocol = request.resourceURL.query.type

    setTimeout(()  => {
        if(connection.protocol === 'buscador')
            connection.send(JSON.stringify({ type: 'get_result' }))
    }, 500)

    const sendProductToFront = (pid, product) => {
        for(let i in wsServer.connections){
            let conn = wsServer.connections[i]
            //console.log(`${conn.pid} === ${_data.pid} && ${conn.protocol} == client`, conn.protocol)
            if(Number(conn.pid) === Number(pid) && conn.protocol === 'client'){
                conn.send(JSON.stringify({
                    type: 'result-product',
                    product
                }))

                break
            }
        }
    }

    connection.on('message', async function(data){
        const _data = JSON.parse(data.utf8Data)
        console.log(_data);
        
        /**
         * El cliente solicita una busqueda
         */
        if(_data.type === 'send_search'){
            let new_pid = last_pid+1
            connection.pid = new_pid

            for(let i in wsServer.connections){
                let conn = wsServer.connections[i]
                console.log(conn.busy, conn.protocol, conn.pid)
                if(!conn.busy && conn.protocol === 'buscador'){
                    conn.busy = true
                    conn.send(JSON.stringify({
                        type: 'search',
                        value: _data.value,
                        pid: new_pid
                    }))
                }
            }
        }

        /**
         * El buscador retorna el resultado
         */
        if(_data.type === 'result'){
            console.log('parseando la info')

            for(let i in _data.data){
                const { id } = _data.data[i]
                try {
                    console.log('buscando', id)
                    let prod = await scrape(id)
                    console.log('encontrado', id)
                    sendProductToFront(_data.pid, prod)
                }catch(err){
                    console.log('fallo buscar', id)
                }
            }
            connection.busy = false
        }
    })

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.protocol + ' ' + connection.remoteAddress + ' disconnected.');
    });
});