var webrtc;
var yourID;
var username;

var updateCubeWithVideo = function(divID, clientID){
  console.log("updated cube videoid: "+clientID);
  var video = document.getElementById(divID);
   // var position =  {
   //    xPosition: 0,
   //    yPosition: 25.1,
   //    zPosition: 0,
   //    xRotation: 0,
   //    yRotation: 0,
   //    zRotation: 0
   //  };
  var debugCube = false;

  var videoTexture = new THREE.VideoTexture( video );
  videoTexture.generateMipmaps = false;
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;

 var materialArray = [];
  scene = scene || window.scene;
  var plainMaterial = new THREE.MeshBasicMaterial( { color: new THREE.Color('grey') } );
  materialArray.push(plainMaterial);
  materialArray.push(plainMaterial);
  materialArray.push(plainMaterial);
  materialArray.push(plainMaterial);
  materialArray.push(plainMaterial);
  if(debugCube){
    materialArray.push(new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'images/smiley.png' ) }));
  }else{
    materialArray.push(new THREE.MeshBasicMaterial( { map: videoTexture }));
  }
  var MovingCubeMat = new THREE.MeshFaceMaterial(materialArray);

  var cube  = scene.getObjectByName('player-'+clientID);
  cube.material = MovingCubeMat;
  cube.material.needsUpdate = true;
};


var updateWallWithScreen = function(divID){
  var video = document.getElementById(divID);

  var videoTexture = new THREE.VideoTexture( video );
  videoTexture.generateMipmaps = false;
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;

  scene = scene || window.scene;
  var movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true } );
  // the geometry on which the movie will be displayed;
  //    movie image will be scaled to fit these dimensions.

  var presentation = new THREE.Mesh( new THREE.PlaneBufferGeometry( 75, 50, 1, 1 ), movieMaterial );
  presentation.position.set(-100,10,51);
  presentation.name = "presentation";
  // // presentation.rotation.y = Math.PI / 180;
  // var yAxis = new THREE.Vector3(0,1,0);
  // rotateAroundWorldAxis(mesh, yAxis, Math.PI / 180);
  scene.add(presentation);
};

var addChatMessage = function(peerID, message){
  console.log('got chat message from: '+peerID+' with message '+message);
}


function videoAdd(video, peer, clientID, isScreen){
  //if regular peer video stream
  if(!isScreen){
    // Now, open the dataChannel
    var dc = peer.getDataChannel('realTalkClient');
    // Now send my name to all the peers
    // Add a small timeout so dataChannel has time to be ready
    setTimeout(function(){
      console.log('sent videoAdd clientID: '+clientID);
      webrtc.sendDirectlyToAll('realTalkClient','setClientID', clientID);
    }, 3000);
  }
  //else if is a screenshare connection
  else{
    // Now send my name to all the peers
    // Add a small timeout so dataChannel has time to be ready
    // console.log('sent screenShare clientID: '+clientID);
    // webrtc.sendDirectlyToAll('realTalkClient','startScreenShare', clientID);
    updateWallWithScreen(peer.id+'_screen_incoming');


    // document.getElementById(peer.id+'_screen_incoming').setAttribute("id", data.payload);
  }
}

//ongetclientID
var initWebRTC = function(clientID){
  //console.log('initializing webrtc in rtcMain.js');
  //store clientID
  yourID = clientID;
  //ask for username
  username = prompt("Please enter your name", "Anonymous");

  //create webRTC obj from library
  webrtc = new SimpleWebRTC({
    // the signalmaster URL to implement handshakes
    url: '/signalmaster',
    // the id/element dom element that will hold "our" video
    localVideoEl: 'localVideo',
    // the id/element dom element that will hold remote videos
    remoteVideosEl: 'remotesVideos',
    // immediately ask for camera access
    autoRequestMedia: true
  });

  //create webRTC listeners

  //listen for other clients joining webRTC room, render their video
  webrtc.on('channelMessage', function (peer, label, data) {
    if (data.type === 'setClientID') {
      peer.socketID = data.payload;
      //console.log('data object from channel message');
      //console.log(data);
      updateCubeWithVideo(peer.id+'_video_incoming', data.payload);
      //add clientID to DOM video node
      document.getElementById(peer.id+'_video_incoming').setAttribute("id", data.payload);
    } else if (data.type === 'chatMessage'){
      addChatMessage(peer.id, data.payload.message, data.payload.username);
    }
  });

  webrtc.on('videoAdded', function(video,peer){
    var isScreen = false;
    if(peer.type === 'screen'){
      isScreen = true;
    }
    videoAdd(video, peer, yourID, isScreen);
  });

  webrtc.on('readyToCall', function () {
    //variable that allows pointer lock
    webrtc.webcam = true;
    // you can name it anything
    webrtc.joinRoom('realTalkClient');
  });

  // webrtc.on('debug-consolelog', function (obj) {
  //   console.log('debug console log from server');
  //   console.log(obj);
  // });

  setInterval(function(){
    //console.log('updating sound')
    webrtc.setVolumeForAll(0);
  },1000);
};

//send a chat message
var sendChatMessage = function(message){
  console.log(message);
  webrtc.sendDirectlyToAll('realTalkClient','chatMessage', {message:message, username:username});
  addChatMessage(null, message, 'You');
};

//receive a chat message from a peer
var addChatMessage = function(peerID, msgText, msgOwner){
  //construct new chat el
  var chatMessage = $('<div></div>').html(msgOwner+': '+msgText).attr('id','chatMessage');
  //add new chat message to the chatBox
  $('#chatInput').before(chatMessage);

  //attach a timer
  //after 10 seconds, fade it out slowly, then remove it from the DOM
  setTimeout(function(){
    chatMessage.hide('slow', function(){ chatMessage.remove(); });
  },20000);
}
// // set volume on video tag for all peers takse a value between 0 and 1
// SimpleWebRTC.prototype.setVolumeForAll = function (volume) {
//     this.webrtc.peers.forEach(function (peer) {
//         if (peer.videoEl) peer.videoEl.volume = volume;
//     });
// };

playerEvents.addListener('start_webRTC', initWebRTC);
playerEvents.addListener('sendChatMessage', sendChatMessage);

var rotObjectMatrix;
function rotateAroundObjectAxis(object, axis, radians) {
    rotObjectMatrix = new THREE.Matrix4();
    rotObjectMatrix.makeRotationAxis(axis.normalize(), radians);

    // old code for Three.JS pre r54:
    // object.matrix.multiplySelf(rotObjectMatrix);      // post-multiply
    // new code for Three.JS r55+:
    object.matrix.multiply(rotObjectMatrix);

    // old code for Three.js pre r49:
    // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
    // old code for Three.js r50-r58:
    // object.rotation.setEulerFromRotationMatrix(object.matrix);
    // new code for Three.js r59+:
    object.rotation.setFromRotationMatrix(object.matrix);
}

var rotWorldMatrix;
// Rotate an object around an arbitrary axis in world space       
function rotateAroundWorldAxis(object, axis, radians) {
    rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);

    // old code for Three.JS pre r54:
    //  rotWorldMatrix.multiply(object.matrix);
    // new code for Three.JS r55+:
    rotWorldMatrix.multiply(object.matrix);                // pre-multiply

    object.matrix = rotWorldMatrix;

    // old code for Three.js pre r49:
    // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
    // old code for Three.js pre r59:
    // object.rotation.setEulerFromRotationMatrix(object.matrix);
    // code for r59+:
    object.rotation.setFromRotationMatrix(object.matrix);
}