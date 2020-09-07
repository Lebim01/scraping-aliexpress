console.log('INYECTADO!')

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

const parseItem = (li) => {
    const id = li.querySelector('div.product-card').getAttribute('data-product-id')
    const title = li.querySelector('a.item-title').innerText
    const price = li.querySelector('span.price-current').innerText
    const image = 'https:'+li.querySelector('img.item-img').getAttribute('src').replace('jpg_220x220xz.', '')
    return {
        id,
        title,
        price,
        image
    }
}

const socket = new WebSocket('ws://localhost:8080?type=buscador');

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data)

    console.log('event', data)

    if(data.type === 'search'){
        setCookie('pid', data.pid)

        console.log('solicitud de busqueda recibida', data)

        document.querySelector('input[name=SearchText]').value = data.value

        document.querySelector('input[type=submit].search-button').click()
    }

    if(data.type === 'get_result'){
        const pid = getCookie('pid')

        window.scrollTo(0, document.querySelector('body').scrollHeight)

        console.log('get_result', pid)

        setTimeout(() => {
            if(pid){
                setCookie('pid', '')
                
                const ul = document.querySelector('ul.list-items')

                console.log(ul)
    
                const li_items = Array.from(ul.querySelectorAll('li.list-item'))

                console.log(li_items)
            
                const items = li_items.map(parseItem)
    
                console.log(items)
            
                socket.send(JSON.stringify({
                    type: 'result',
                    pid,
                    data: items
                }))
            }
        }, 1000)
    }
})