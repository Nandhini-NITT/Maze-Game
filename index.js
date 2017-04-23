var http = require('http');
var io = require('socket.io')(server);
var express         = require('express');
var UUID            = require('node-uuid');
var app             = express();
var server          = http.createServer(app);
var sio             = require('socket.io').listen(server); 

var Player =function(id) {
    this.id = id;
    this.x = 0;
    this.y = 0;
}
var players=[],games=[],flag=0;
console.log ('Server started.');
server.listen(8080);
console.log('\t Listening on port 8080'  );

app.get( '/', function( req, res ){ 
    res.sendFile( __dirname + '/'+'game.html' );
    });
app.get( '/socket.io.js' , function( req, res, next ) {
    res.sendFile( __dirname + '/' + 'node_modules/socket.io-client/dist/socket.io.js');
    });
sio.sockets.on('connection', function(client) {
    console.log("New player has connected: "+client.id);
    client.on ('playerReady', function () {
            console.log("player ready");
            var newPlayer = new Player (client.id);
            players.push (newPlayer);
            sio.sockets.to(client.id).emit('initializePlayer',{player:newPlayer});
            flag=0;
            for(var i=0;i<games.length;i++)
            {
                if(games[i].noOfPlayers==1)
                {
                    flag=1;
                    games[i].opponent=client.id;
                    games[i].noOfPlayers+=1;
                    sio.sockets.to(client.id).emit('changePosition');
                    sio.sockets.emit('startGame',{player:newPlayer});
                ;
                }
            }
            if(flag==0)
             {
                sio.sockets.emit("Waiting");
                var game_id=games.length+1;
                var opponent=null;
                var game={id:game_id,noOfPlayers:1,host:client.id,opponent:opponent};
                games.push(game);
            }
    });
        client.on('playerMoved',function(data){
            var clientDetails,playerToSend;
            for(var i=0;i<players.length;i++)
            {
                if(players[i].id==data.player.id)
                {
                    players[i].x=data.player.x;
                    players[i].y=data.player.y;
                }
            }
            for(var i=0;i<games.length;i++)
            {
                if(games[i].host==client.id)
                {
                    playerToSend=games[i].opponent;
                }
                else if(games[i].opponent==client.id)
                {
                    playerToSend=games[i].host;
                }
                sio.sockets.to(playerToSend).emit('updatedOpponent',{opponent:data});

            }
        });
        client.on('Winner',function(data){
            var playerToSend;
            for(var i=0;i<games.length;i++)
            {
                if(games[i].host==client.id)
                {
                    playerToSend=games[i].opponent;
                    break;
                }
                else if(games[i].opponent==client.id)
                {
                    playerToSend=games[i].host;
                    break;
                }
            }
                sio.sockets.to(playerToSend).emit("opponentWon");
                games.splice(i,1);
                players = players.filter(function( obj ) {
            return obj.id  !== client.id;
            });
    });
   client.on('disconnect', function (data) {
        console.log('client disconnected');
        var playerToSend;
        for(var i=0;i<games.length;i++)
        {
            if(games[i].host==client.id)
            {
                playerToSend=games[i].opponent;
                break;
            }
            else if(games[i].opponent==client.id)
            {
                playerToSend=games[i].host;
                break;
            }
        }
        sio.sockets.to(playerToSend).emit("opponentLeft");
        games.splice(i,1);
         players = players.filter(function( obj ) {
            return obj.id  !== client.id;
            });
    });
});
