/* (C)2012 Adam Latchem All Rights Reserved.
 *
 * If you are interested in using this code please contact me:
 * . adam@intrepiduniverse.com
 */

// TODO make private again
var api = {};
var level_path = 'data/';
var image_path = 'images/';
//var nemesis = ['nemesis_blue','nemesis_brown','nemesis_green','nemesis_greenblue','nemesis_lightblue','nemesis_lightgreen','nemesis_lime','nemesis_neon','nemesis_pink','nemesis_purple','nemesis_red','nemesis_yellow','nemesis_cartoon'];
//var blocks = ['block_yellow','block_purple','block_red','block_pink','block_lime','block_lightblue','block_greenblue','block_green','block_brown','block_blue','block'];
var teleports = ['teleport_blue','teleport_brown','teleport_green','teleport_greenblue','teleport_lightblue','teleport_lime','teleport_pink','teleport_purple','teleport_red','teleport_yellow','teleport'];  
var seleted_target = null;
var can_seleted_target = false;
var path_to_walk = [];
var game_state = "init"; 
var current_turn = 0;
var grid_data = []; 
var player_config = {
    p1: {
      color : 'yellow',
      CRYSTAL_GID : 8,
      activeRobots : 0,
      NEMESIS_GID : 10,
      startX : 5,
      startY : 0,
      robotCount : 10,
      robotScoreTrigger : 50,
      robotSpeed : 250,
      crystalTarget : 9,
      xv : 1,
      yv : 1,
      state : 4 ,
      isBot : 1,  
      walk_radious : 2 
    },
    p2 : {
      color : 'red',
      CRYSTAL_GID : 9,
      activeRobots : 0,
      NEMESIS_GID : 11,
      startX:5,
      startY:14,
      robotCount : 10,
      robotScoreTrigger : 50,
      robotSpeed : 250,
      crystalTarget : 8,
      xv : -1,
      yv : 1, 
      state : 2,   
      isBot : 1,  
      walk_radious : 2  
    }
  };

var ITEM_GID = 50;
var ITEM_GID2 = 51;
var nodes = [];
(function(jQuery) {

  "use strict";

  $ = jQuery;

  

  var NEMESIS_GID = 7;
  var TELEPORT_GID = 6;
  var CAPTION_LENGTH = 5000;
  


  
  // Level properties:
  // . robotCount
  // . robotScoreTrigger
  // . robotSpeed
  // . startX
  // . startY
  // . teleportTarget
  //
  // Tileset properties
  // . yoffset
  function loadLevel(url, target)
  {
    $.getJSON(url, function(level) {
      var props = level['properties'];

      api['level'] = level;
      api['numTeleported'] = 0;
      api['xoffset'] = $('#screen').innerWidth() * 0.7 ;
      api['yoffset'] = 4;
      api['objectCount'] = 0;
      api['robotScore'] = 0;
      api['score'] = 0;
      api['activeRobots'] = 0;

      api['layers'] = level['layers'];
      api['width'] = level['width'];
      api['height'] = level['height'];
      api['tW'] = level['tilewidth'];
      api['tH'] = level['tileheight'] * 2;
      api['hTW'] = api['tW'] / 2;
      api['hTH'] = api['tH'] / 2;
      api['qTW'] = api['tW'] / 4;
      api['qTH'] = api['tH'] / 4;

      api['robotCount'] = parseInt(props['robotCount']);
      api['robotSpeed'] = parseInt(props['robotSpeed']);
      api['teleportTarget'] = parseInt(props['teleportTarget']);
      api['startX'] = parseInt(props['startX']);
      api['startY'] = parseInt(props['startY']);
      api['robotScoreTrigger'] = parseInt(props['robotScoreTrigger']);

      // Create css class for each tile in the map - help in #style
      $('#style').empty();
      var gid = 0;
      api['gids'] = {};
      var stylesheet = "";
      for (var tset = 0; tset < level['tilesets'].length; ++tset) {
        var tileset = level['tilesets'][tset];
        gid = tileset['firstgid'];
        var imageWidth = tileset['imagewidth'];
        var imageHeight = tileset['imageheight'];
        var tileWidth = tileset['tilewidth'];
        var tileHeight = tileset['tileheight'];
        var x = 0;
        var y = 0;
        var yoffset = 0;
        var xoffset = 0;
        if (typeof tileset['properties']['yoffset'] != 'undefined') {
          yoffset = parseInt(tileset['properties']['yoffset']);
        }
        if (typeof tileset['properties']['xoffset'] != 'undefined') {
          xoffset = parseInt(tileset['properties']['xoffset']);
        }
        while (true) {
          api['gids'][gid] = {'width':tileWidth, 'height':tileHeight,
            'top':y, 'left':x, 'yoffset':yoffset, 'xoffset':xoffset};
          stylesheet += (' .gid' + gid +
            " { background-image: url('" + image_path + tileset['image'] +
            "'); width: " + tileWidth +
            "px; height: " + tileHeight +
            "px; background-position: " + (-x) + "px " + (-y) +
            "px; background-repeat: no-repeat; position: absolute; }");
          gid++;
          x += tileWidth;
          if (x >= imageWidth) {
            x = 0;
            y += tileHeight;
          }
          if (y >= imageHeight) {
            break;
          } 
        }
      }
      $('#style').remove();
      $('<style id="style">' + stylesheet + '</style>').appendTo('head');
      //console.log('gid', gid, stylesheet );
          
      var data = api['layers'][0].data;
      var count = 0;
      var nodeRow = [];
      
      for(var x=0;x<data.length ;x++) {
        count ++;
        var _grid_data = data[x] > 0 ? 1: 0;

        nodeRow.push(_grid_data);
        if (count == api['layers'][0].width){
          nodes.push(nodeRow);
          count = 0;
          nodeRow = [];
        }

      }
      // Create div element for each map entity
      for (var layer = 0; layer < api['layers'].length; ++layer) {
        var data = api['layers'][layer].data;
        for (var x = 0; x < api['width']; ++x) {
          if(layer == 0){
            grid_data[x] = [];
          }
          for (var y = 0; y < api['height']; ++y) {
            var gid = data[y * api['width'] + x];
          
            if(layer == 0){
              var block_class = blocks[(Math.random() * (blocks.length-1) ).toFixed(0)];
              grid_data[x].push( block_class );
              var item = items_database[(Math.random() * (items_database.length-1) ).toFixed(0)];
            }else{
              var block_class = "";
              var item = "";
            }
            addObject(target, layer, x, y, gid, block_class, item);
          }
        }
      }
      //console.log('grid_data', grid_data); 
      $('#robotCount').text(api['robotCount']);
      $('#score').text(api['score']);
 
    });
  }


  // Object attrs
  // . l N layer N
  // . x N x coord N
  // . y N y coord N
  // . xv N xv N
  // . yv N yv N
  // . s N sprite state N
  //
  // Object classes
  // . gidN tileset gid N
  function addObject(target, layer, x, y, gid, blockd_class, item) {
    // TODO somekind of z ordering sort is required.
    if (0 != gid) {

      //console.log('addObject', gid);
      var dims = api['gids'][gid];
      var p = toScreen(x, y);
      var X = p.x + dims['xoffset']; 
      var Y = p.y - (dims['height'] - api['tH']) + dims['yoffset'];
      var id = 'l' + layer + 'x' + x + 'y' + y + 'o' + api['objectCount'];
      api['objectCount']++;
      //var blockd_class = blocks[(Math.random() * blocks.length).toFixed(0)];
      
      target.append("<div id='" + id + "' class='gid" + 1 +" " + (blockd_class || "") +  "' style='top:" + Y + "px; left:" + X + "px;'></div>");
      var _id = $('#' + id);
      _id.attr('x', x).attr('y', y).attr('l', layer).attr('s', 1).attr('gid', gid);

      _id.data('item',item);
      if(gid>61){
        // coins 3 
        // 62 - 64
           _id.css('backgroundImage', "url(../images/coin_"+ (61 == gid?'gold':(62 == gid?'silver':'copper')) +".png) !important;"); 
           _id.css('backgroundPosition', '0 0  !important;');
           _id.attr('xv','1').attr('yv','1')
            .sprite({fps: 8, no_of_frames: 8})
            .removeClass(blockd_class);
          _id.attr('value','100').attr('color','yellow');
          _id.addClass('coins');
          _id.addClass('items');

        return;

      }else if(gid>=50){
        // boxes color 11
        // 51 - 61
        var no = (Math.random() * 11).toFixed(0);
           _id.css('backgroundImage', "url(../images/IsoCubes_"+ (no < 10 ? '0'+no:no) +".png) !important;"); 
           _id.css('backgroundPosition', '0 0  !important;');
           _id.removeClass(blockd_class);
           _id.addClass('boxes');
           _id.attr('value','200').attr('color','red');
           _id.addClass('items');

        return;

      }else{

      } 

      switch(gid){
    
        case ITEM_GID:
        case ITEM_GID2:
           var no = (Math.random() * 11).toFixed(0);
           _id.css('backgroundImage', "url(../images/IsoCubes_"+ (no < 10 ? '0'+no:no) +".png) !important;"); 
           _id.css('backgroundPosition', '0 0  !important;');
           _id.removeClass(blockd_class);
           //.sprite({fps: 6, no_of_frames: 6});
          
          break; 

        case player_config.p1.NEMESIS_GID:

          var nemesis_class = 'nemesis_' + player_config.p1.color;
          _id.attr('xv','1').attr('yv','1')
          .sprite({fps: 6, no_of_frames: 6});
          //.animate({top:'+=16px',left:'+=32px'}, api['robotSpeed'], 'linear', walkAtEdge);
          _id.addClass(nemesis_class);
          _id.addClass('p1');
          _id.addClass('player');
          break;

        case player_config.p2.NEMESIS_GID:

          var nemesis_class = 'nemesis_' + player_config.p2.color;
          _id.attr('xv','1').attr('yv','1')
          .sprite({fps: 6, no_of_frames: 6});
          //.animate({top:'+=16px',left:'+=32px'}, api['robotSpeed'], 'linear', walkAtEdge);
          _id.addClass(nemesis_class);
          _id.addClass('p2');
          _id.addClass('player');
          break;  

        case NEMESIS_GID:

          var nemesis_class = nemesis[(Math.random() * (nemesis.length-1) ).toFixed(0)];
          _id.attr('xv','1').attr('yv','1')
          .sprite({fps: 6, no_of_frames: 6})
          .animate({top:'+=16px',left:'+=32px'}, api['robotSpeed'], 'linear', walkAtEdge);
          _id.addClass(nemesis_class);
          break;

        case TELEPORT_GID:   

          var teleports_class = teleports[(Math.random() * (teleports.length-1)).toFixed(0)];
          _id.addClass(teleports_class);

          break;

        case player_config.p1.CRYSTAL_GID:

          var teleport_color = 'teleport_' + player_config.p1.color;
          var teleports_class = teleport_color;
          _id.addClass(teleports_class);

          break;

        case player_config.p2.CRYSTAL_GID:

          var teleport_color = 'teleport_' + player_config.p2.color;
          var teleports_class = teleport_color;
          _id.addClass(teleports_class);

          break;  
      }

      return _id;
    }
  }
 
  function createElementExplode(gid, x, y) {
    //
    var dims = api['gids'][gid];
    if (gid == undefined){
      return false;
    }
    //console.log( 'gid ', gid );

    var p = toScreen(x, y);
    var X = p.x - 64; 
    var Y = p.y - (dims['height'] - api['tH']) - 64;

    var canvas_ex = $('<div class="explode" width="64" height="64" style="top:' + Y + 'px; left:' + X + 'px;"  ></canvas>');
    $('body').append(canvas_ex);
    canvas_ex.css({
      left : x,
      top : y,
      'position' : 'absolute',
      'z-index' : 50,
      'opacity' : 1
    }).hide();

    return canvas_ex;
  }
        
  // Handle mouse clicks on game area
  $('#screen').mousedown(function(e) {

    if(!can_seleted_target){
      return false;
    }

    var p = fromScreen(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
    var s = $('div[x="' + p.x + '"][y="' + p.y + '"][l="0"]');

    if (!seleted_target){
      if (s.hasClass('gid2')) {
        s.removeClass('gid2');
        s.addClass('gid3');
      } else if (s.hasClass('gid3')) {
        s.removeClass('gid3');
        s.addClass('gid4');
      } else if (s.hasClass('gid4')) {
        s.removeClass('gid4');
        s.addClass('gid5');
      } else if (s.hasClass('gid5')) {
        s.removeClass('gid5');
        s.addClass('gid2');
      }
    }

    if (seleted_target){
      // show explode effect
 
      var posX = e.pageX - this.offsetLeft;
      var posY = e.pageY - this.offsetTop;
      var gid = s.attr('gid');
      var radious = 2;
      var target_explosion = getStraitLineExplosion(radious, p);
      // create anim elements
      var dropMissile = function(){
        for(var i=0;i<target_explosion.length;i++) {
          var ex = target_explosion[i];
          var time_to_start = Math.random() * 250;
          var _s = $('div[x="' + ex[0] + '"][y="' + ex[1] + '"][l="0"]');
          var screenCoor = toScreen(ex[0], ex[1]);
          var el = createElementExplode(_s.attr('gid'), screenCoor.x , screenCoor.y );
          
          //dropBombAnimation(_s.attr('gid'), screenCoor.x , screenCoor.y , el);
          
          dropItemAnimation(_s.attr('gid'), screenCoor.x , screenCoor.y , el);


          //animExplode(el);
        } 
        //var screenCoor = toScreen(p.x, p.y);
        //laserRayAnimation( gid, screenCoor.x , screenCoor.y , 'red' );

      }

      //animationPlane(dropMissile);
      
      //var screenCoor = toScreen(p.x, p.y);
      //animPoint(screenCoor.x , screenCoor.y);
    }

    if(seleted_target && ( seleted_target.attr('x')  != p.x || seleted_target.attr('y')  != p.y) ){
      //go to this point.
      resetTrial();

      var graph = new Graph(nodes);
      var start = graph.nodes[seleted_target.attr('y')][seleted_target.attr('x')];
      //console.log( 'start', start);
      var end = graph.nodes[p.y][p.x];
      //console.log( 'end', end);
      //if (seleted_target.attr('x')  != p.x && seleted_target.attr('y')  != p.y){
        path_to_walk = astar.search(graph.nodes, start, end);
        //console.log( 'path_to_walk', path_to_walk );
        walkTrial();
      //}
      
    }
 
  });



  // called when robot at edge of new square
  function walkAtEdge() {

    var xv = parseInt($(this).attr('xv'));
    var yv = parseInt($(this).attr('yv'));
    var p = fromScreen(
      this.offsetLeft + 64 + yv * 32,
      this.offsetTop + 100 + xv * 16);
 
    //console.log('walkAtEdge', p.x, p.y, xv, yv);
    //query block (l=0)
    var b = $('div[x="' + p.x + '"][y="' + p.y + '"][l="0"]');

    // Fall off edge of blocks
    if (0 == b.length) {
      soundManager.play('bing');
      removeRobot($(this));
      return;
    }

    // query another robot (l=1)
    var r = $('div[x="' + p.x + '"][y="' + p.y + '"][l="1"]');
    if (r.length > 0) {
      soundManager.play('crash');
      removeRobot($(this));
      return;
    } else {

      // update location in class attributes
      $(this).attr('x', p.x).attr('y', p.y);
    }

    $(this).animate({top:'+=' + xv * 16 + 'px', left:'+=' + yv * 32 + 'px'},
      api['robotSpeed'], 'linear', walkAtCenter);
  }

  // called when robot at center of square
  function walkAtCenter() {
    // Calculate where the character is on the isometric grid
    var p = fromScreen(this.offsetLeft + 64, this.offsetTop + 100);
    var e = $('div[x="' + p.x + '"][y="' + p.y + '"][l="0"]');

    // make any dynamic adjustments due to grid location
    var xv = parseInt($(this).attr('xv'));
    var yv = parseInt($(this).attr('yv'));

    //console.log('walkAtCenter', p.x, p.y, xv, yv);

    // change of direction
    var state = $(this).attr('s');
    if (e.hasClass('gid2')) { // up
      xv = -1;
      yv = 1;
      state = 2;
    } else if (e.hasClass('gid3')) { // left
      xv = -1;
      yv = -1;
      state = 3;
    } else if (e.hasClass('gid4')) { // down
      xv = 1;
      yv = -1;
      state = 4;
    } else if (e.hasClass('gid5')) { //right
      xv = 1;
      yv = 1;
      state = 1;

    // teleporter
    } else if (e.hasClass('gid' + TELEPORT_GID)) {
      soundManager.play('teleport');
      api['score'] += 100;
      $('#score').text(api['score']);
      api['numTeleported'] += 1;
      removeRobot($(this));
      spinDirection();
      return;
    }

    // update score
    api['score'] += 5;
    $('#score').text(api['score']);
    if (api['score'] > api['robotScore'] + api['robotScoreTrigger']) {
      addNewRobot();
    }

    // setup the next animation sequence
    $(this).animate({top:'+=' + xv * 16 + 'px',left:'+=' + 32 * yv + 'px'},
      api['robotSpeed'], 'linear', walkAtEdge);
    $(this).spState(state);
    $(this).attr('xv', xv).attr('yv', yv).attr('s', state);
  }

  function removeRobot(jQRobot) {
    jQRobot.destroy();
    jQRobot.remove();
    api['activeRobots']--;

    // to ensure respawn if all walk off edge
    if (0 == api['activeRobots']) {
      api['robotScore'] = - api['robotScoreTrigger'];
    }
    updateRobotCount();
  }

  function updateRobotCount() {
    if (0 == api['robotCount']) {
      if (api['numTeleported'] >= api['teleportTarget']) {
        nextLevel();
      } else {
        gameOver();
      }
    } else {
      if (api['score'] > api['robotScore'] + api['robotScoreTrigger']) {
        addNewRobot();
      }
    }
  }

  function addNewRobot() {
    if (api['robotCount'] > 0 && api['activeRobots'] < 2) {
      api['robotCount']--;
      $('#robotCount').text(api['robotCount']);
      var robot = addObject(
        $('#level'), 1, api['startX'], api['startY'], NEMESIS_GID);
      api['robotScore'] = api['score'];
      api['activeRobots']++;
    }
  }
 
  function addNewPlayerCharacter(p) {

      p = p || 'p1';
      var player = player_config[p];
      if (player.activeRobots > player.robotCount){
        return false;
      }

      var robot = addObject( $('#level'), 1, player.startX , player.startY , player.NEMESIS_GID );
      robot.attr('xv',player.xv).attr('yv',player.yv).attr('s', player.state);
      robot.spState(player.state);  
      robot.removeClass('vignette');  
      robot.click(function(){
        $('.vignette').removeClass('vignette');  
        seleted_target = $(this);
        seleted_target.addClass('vignette'); 

        var b = $('div[x="' + seleted_target.attr('x') + '"][y="' + seleted_target.attr('y') + '"][l="0"]');
        if (0 == b.length) {
          console.log(b, seleted_target.attr('x') , seleted_target.attr('y'));
          return;
        }
       

      });
      
      player.activeRobots ++;

      console.log('addNewPlayerCharacter', p, robot);
  }


  function removePreviousLevel() {

    // remove robots
    $('div[l="1"]').each(function(idx) {
      $(this).destroy();
      $(this).remove();
    });

    // remove all squares
    $('div[l="0"]').each(function(idx) {
      $(this).remove();
    });
  }

  function nextLevel() {
    removePreviousLevel();
    loadLevel(level_path +'level1.json', $('#level'));

    // use timer to get around the elements not there before rendering.
    safeTimeout(addNewRobot, 1000);
 
    safeTimeout(function(){
      addNewPlayerCharacter('p1'); 
      addNewPlayerCharacter('p2'); 
      animationPlane();


      // create the timer
      /*$('#demoTimer').polartimer({
       timerSeconds: 4,
       color: '#F00',
       opacity: 0.7,
       callback: function () {
        console.log('jquery.polartimer.js: done!');
       }
      });

      // start the timer
      $('#demoTimer').polartimer('start');*/

      fsm.start();

    }, 1000);

    //start state
    

  }

  function gameOver() {/*
    removePreviousLevel();
    var c = $('#credit');
    c.text('End');
    c.css('color','#00CC00');
    captionAnim(c);
    safeTimeout(function() { introScreen(0); }, CAPTION_LENGTH);*/
  }

  function spinDirection() {
    $('.gid2, .gid3, .gid4, .gid5').each(function(idx) {
      var gid = Math.floor(Math.random() * 4) + 2;
      for (var i = 2; i < 6; ++i) {
        if (gid == i) {
          $(this).addClass('gid' + gid);
        } else {
          $(this).removeClass('gid' + i);
        }
      }
    });
  }

  function introScreen(stage) {
    var c = $('#credit');
    switch(stage) {
      case 0:
      {
        var s = $('#startButton');
        if (0 == s.length) {
          s = $('<div id="startButton" class="span1 btn btn-success">Start</div>');
          s.appendTo($('#screen'));
          s.click(startGame);
        }
        s.show();
        c.html('Inspired by Neon light and Star in the sky.');
        c.css('color', 'cyan');
        safeTimeout(function() { introScreen(stage + 1); }, CAPTION_LENGTH);
        break;
      }
      case 1:
      {
        c.css('color', '#00CC00');
        c.text('Robot path trial.');
        safeTimeout(function() { introScreen(stage + 1); }, CAPTION_LENGTH);
        break;
      }
      case 2:
      {
        c.text('Tap Start to Play');
        safeTimeout(function() { introScreen(0); }, CAPTION_LENGTH);
        break;
      }
    }
    captionAnim(c);

  }

  function captionAnim(caption) {
    caption.fadeIn(2000).delay(2000).fadeOut('fast');
  };

  function startGame() {
    clearTimeout(api['timeout']);
    $('#credit').empty();
    $('#startButton').hide();
    nextLevel();
  }

  function safeTimeout(f, d) {
    if (typeof api['timeout'] != 'undefined') {
      clearTimeout(api['timeout']);
      api['timeout'] = null;
    }
    api['timeout'] = setTimeout(f, d);
  }

  function titleCharater(){
    $('#main').show();
    $(".character1").sprite({fps: 6, no_of_frames: 6});
    $(".character2").sprite({fps: 6, no_of_frames: 6});
  }

  function start() {
    soundManager.url = './data'; 
    soundManager.flashVersion = 9; 
    soundManager.useHighPerformance = true;
    soundManager.audioFormats.mp3.required = false;
    soundManager.flashLoadTimeout = 500; 
    soundManager.debugMode = false;
    soundManager.ontimeout(function(status) { 
      soundManager.useHTML5Audio = true; 
      soundManager.preferFlash = false; 
      soundManager.reboot(); 
    }); 
 
    var loader = new PxLoader(), 
      backgroundImg = loader.addImage(image_path+'clouds.jpg'), 
      blockImg = loader.addImage(image_path+'block.png'), 
      nemeisImg = loader.addImage(image_path+'nemesis.png'), 
      teleportImg = loader.addImage(image_path+'teleport.png'); 

    loader.addProgressListener(function(e) { 
      var p = $('#progress-bar');
      if (e.completedCount != e.totalCount) {
        var w = 100.0 * e.completedCount / e.totalCount;
        p.css('width', w + '%');
      } else {
        p.css('width', '110%');
        $('#progress').delay(250).fadeOut('fast');
      }
    });

    loader.addCompletionListener(function() { 
      $('#credit').hide();
      //soundManager.play('EmeraldStarlight', {loops:9999});
      //renderMenuItemsInfo();
      titleCharater();
      safeTimeout(function() { introScreen(0); }, 1000);
    }); 

    soundManager.onready(function() { 
      var soundNames = ['bing','crash','teleport','EmeraldStarlight'], 
        i, url; 
 
      for(i=0; i < soundNames.length; i++) { 
        url = './sounds/' + soundNames[i] + '.m4a'; 
        if (!soundManager.canPlayURL(url)) {
          url = './sounds/' + soundNames[i] + '.ogg';
          if (!soundManager.canPlayURL(url)) {
            console.log('Skipping ' + url);
            continue;
          }
        }
        loader.addSound(soundNames[i], url); 
      }
      loader.start();
    }); 

    var bg_dir;
    var r = Math.random() * 10;
    if (r > 7.5){
      bg_dir = 'up';
    }else if (r > 5.0){
      bg_dir = 'right';
    }else if (r > 2.5){
      bg_dir = 'down';
    }else if (r > 0){
      bg_dir = 'left';
    }
    //$('#screen').pan({fps: 30, speed: 1, dir: bg_dir || 'left' });
  }

  // Start the game once everything is loaded
  $(document).ready(start);

})(jQuery);

