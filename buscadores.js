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

const profitPercent = .50

const addProfitPercent = (price) => {
    const pieces = price.split(' ')

    if(pieces.length === 2){
        const [ currency, max ] = pieces
        const newMax = Math.round(parseFloat(max.trim().replace(',', '.'))*(1+profitPercent)*100, 0)/100
        return `${currency.trim()} ${newMax}`
    }
    if(pieces.length === 4){
        const [ currency, min, separator, max ] = pieces
        const newMin = Math.round(parseFloat(min.trim().replace(',', '.'))*(1+profitPercent)*100, 0)/100
        const newMax = Math.round(parseFloat(max.trim().replace(',', '.'))*(1+profitPercent)*100, 0)/100
        return `${currency.trim()} ${newMin} ${separator.trim()} ${newMax}`
    }

    return price
}

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

    const sendProductToFront = (pid, products) => {
        for(let i in wsServer.connections){
            let conn = wsServer.connections[i]
            if(Number(conn.pid) === Number(pid) && conn.protocol === 'client'){
                conn.send(JSON.stringify({
                    type: 'result-product',
                    products
                }))

                break
            }
        }
    }

    connection.on('message', async function(data){
        const _data = JSON.parse(data.utf8Data)
        
        /**
         * El cliente solicita una busqueda
         */
        if(_data.type === 'send_search'){
            let new_pid = last_pid+1
            connection.pid = new_pid

            for(let i in wsServer.connections){
                let conn = wsServer.connections[i]
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
            sendProductToFront(
                _data.pid, 
                _data.data.map((r) => ({
                    ...r,
                    price: addProfitPercent(r.price)
                }))
            )
            connection.busy = false
        }
    })

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.protocol + ' ' + connection.remoteAddress + ' disconnected.');
    });
});