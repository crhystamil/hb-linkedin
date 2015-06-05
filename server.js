var http = require("http");
var google = require('google');
var ex = require('linkedin-extractor');
var jade = require('jade');
var qs = require("querystring");
var url = require('url');
var fs = require('fs');
var io = require('socket.io');
var datos_post = {};
var data_post_max = 8* 1024 * 1024;
var nextCounter=0;
var server_port = process.env.OPENSHIFT_NODEJS_PORT||process.env.PORT||3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

google.resoltsPerPage=25;

var server = http.createServer(function(request, response){
    console.log('Connection');
    var path = url.parse(request.url).pathname;
    if (request.method == 'POST'){
        var data_post = '';
        request.on('data', function(data_cortada){
            data_post += data_cortada;
            if(data_post.length > data_post_max){
                this.pause();
                response.writeHead(413);
                response.end('ha surgido un problema');
            }
        });
        request.on('end', function(){
            var data_post_obj = qs.parse(data_post);
            datos_post = {pais: data_post_obj.pais, cadena: data_post_obj.cadena};
        });
    }

    switch(path){
        case '/':
            fs.readFile(__dirname + "/index.html", function(error, datas){
               if (error){
                    response.writeHead(404);
                    response.write("opps this doesn't existsd - 404");
               } 
               else{
                    response.writeHead(200, {"Content-Type": "text/html"});
                    response.write(datas, "utf8");
               }
                response.end();
            });
            break;
        case '/style.css':
            fs.readFile(__dirname + path, function(error, datas){
               if (error){
                    response.writeHead(404);
                    response.write("opps this doesn't existsd - 404");
               } 
               else{
                    response.writeHead(200, {"Content-Type": "text/html"});
                    response.write(datas, "utf8");
               }
                response.end();
            });
            break;

        case '/linkedin.html':
            fs.readFile(__dirname + path, function(error, data){
                if (error){
                    response.writeHead(404);
                    response.write("opps this doesn't existss - 404");
                }
                else{
                    response.writeHead(200, {"Content-Type": "text/html"});
                    console.log(datos_post['pais']);
                    console.log(datos_post['cadena']);
                    response.write(data, "utf8");
                }
                response.end();
            });
            break;
        default:
            response.writeHead(404);
            response.write("opps this doesn't exist - 404");
            response.end();
            break;
    }
});

server.listen(server_port, server_ip_address, function(){
    console.log("Listening on"+ server_ip_address+", server_port"+server_port);
});

var ion = io.listen(server);
ion.on('connection', function(socket){
google('site:'+datos_post['pais']+'.linkedin.com '+datos_post['cadena'], function (err, next, links){
    if (err) console.error(err)

    for (var i = 0; i < links.length; ++i) {
        ex.getFromUrl(links[i].link,function(err,res){
        if(res['formattedName'] != '' || res === null){
        ion.emit('message',{'message': jade.renderFile('tpl.jade',{
            'formattedName':res.formattedName
          , 'headline':res.headline
          , 'location':res.location
          , 'industry':res.industry
          , 'numConnections':res.numConnections
          , 'summary':res.summary
          , 'pictureUrl':res.pictureUrl
          , 'publicProfileUrl':res.publicProfileUrl
            })});
        }
        });

        if(nextCounter<4){
            nextCounter += 1
            if (next) next()
        }                    
    }
})
});





