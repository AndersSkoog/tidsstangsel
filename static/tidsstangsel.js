(function(){
    
    const center_btn = document.getElementById('center_to_pos_btn');
    const audio_element = document.getElementById('audio_element');
    var hls = null;
    const fade_time = 4000;
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var gain_node = audioCtx.createGain();
    var audio_src = audioCtx.createMediaElementSource(audio_element);
    audio_src.connect(gain_node);
    gain_node.connect(audioCtx.destination);
    
    function fadeIn(duration = 1000) {
        gain_node.gain.setValueAtTime(0, audioCtx.currentTime); // Start at volume 0
        gain_node.gain.linearRampToValueAtTime(1, audioCtx.currentTime + duration / 1000);  // Fade in to full volume
    }
    
    function fadeOut(duration = 1000) {
        gain_node.gain.setValueAtTime(gain_node.gain.value, audioCtx.currentTime);  // Start from current volume
        gain_node.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration / 1000);  // Fade out to volume 0
    }




    /*
        Map rendering 
    */
    const loc_watchId = null;
    const loc_update_dist_thresh = 10;
    const map_elid = 'map';
    const map_default_center = {lat:65.94215788637115,lng:23.77156416494242};
    const minZoom = 10;
    const maxZoom = 18;
    //const outercirc_r = 30000;
    const perim_coords = [
        {lat:66.07861884433791,lng:23.42988796767048 },{lat:66.05145025686807, lng:23.453778873303154},{lat:66.03250971768911,lng:23.453778873303154},
        {lat:65.99783787055523,lng:23.473100425871106},{lat:65.96714800726235, lng:23.473100425871106},{lat:65.89925927946992,lng:23.455481905038972},
        {lat:65.8726851410739, lng:23.47667303903558 },{lat:65.84758736236873, lng:23.464841863199666},{lat:65.85318724634024,lng:23.51936303812824 },
        {lat:65.84629204084105,lng:23.57313009193574 },{lat:65.83604721013143, lng:23.660302929287248},{lat:65.81318022953319,lng:23.84420820529688 },
        {lat:65.80716540696181,lng:23.935406722180108},{lat:65.80632105453445, lng:23.979497738379415},{lat:65.81196657016935,lng:24.022834633458608},
        {lat:65.83700125484381,lng:24.140993057011002},{lat:65.89507606926092, lng:24.12169542532598 },{lat:65.9488388144081 ,lng:24.067708222081166},
        {lat:66.0019998101951 ,lng:24.031485342608207},{lat:66.04978639006714, lng:23.962835254939222},{lat:66.0417976205944 ,lng:23.862551540519206},
        {lat:66.03847636071225,lng:23.805552863487463},{lat:66.04925738658366, lng:23.630747698847294},{lat:66.04065045882774,lng:23.517695585770824},
        {lat:66.05154610474847,lng:23.528416194173204},{lat:66.06335993021409, lng:23.530464409683518},{lat:66.08473601744394,lng:23.505519897434187},
        {lat:66.07861884433791,lng:23.42988796767048 }
    ];
    const default_sim_loc = {lat:65.95112593241089,lng:23.41035690712829};

    const map_bounds_se = {lat:66.10841570645661,lng:24.308165089469185};
    const map_bounds_nw = {lat:65.79491483132819,lng:23.3649201362781};
    const map_bounds = L.latLngBounds(map_bounds_se,map_bounds_nw);
    var prev_loc = null;
    var prev_loc_within_map = null;
    var prev_loc_within_perim = null;

    var map_obj = L.map(map_elid,{
        center:map_default_center,
        zoom:minZoom,
        closePopupOnClick:false,
        minZoom:minZoom,
        maxZoom:maxZoom
    });

    var imageUrl = '/static/verner_bostrom.jpg';
    
    var img_bounds_se = [65.8701617972998,23.545387239604423];
    var img_bounds_nw = [66.01764602127346,23.930111220862244];
    var img_bounds = L.latLngBounds([img_bounds_se,img_bounds_nw]);


    //var img_bounds = L.latLngBounds([[65.92964186905581,23.687173656890252],[65.97238087976748,23.880500232514976]]);
    //var map_tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png');

    var tile_url = "https://"+window.location.hostname+"/osm/{z}/{x}/{y}.png";
    var map_tiles = L.tileLayer(tile_url,{
        maxZoom: maxZoom,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    map_tiles.addTo(map_obj);

    var perim = L.polygon(perim_coords,{ color:'blue', fillOpacity: 0.1, interactive: false});
    var imgovrlay = L.imageOverlay(imageUrl, img_bounds, {opacity:0.35});
    //var bounds_rect  = L.rectangle(map_bounds,{color:'green',weight:1,fillOpacity:0.3, interactive:false})
    var loc_marker = null;



    function isPointInPolygon(testPoint, polygon) {
        let cnt = 0;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            let xi = polygon[i].lat, yi = polygon[i].lng;
            let xj = polygon[j].lat, yj = polygon[j].lng;
            let x = testPoint.lat;
            let y = testPoint.lng;
            let intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) {cnt += 1}
        }
        return cnt%2 === 1;
    }

    function within_perim(coord) {
        return isPointInPolygon(coord,perim_coords);
    }

    function within_map(coord) {
        return map_bounds.contains(coord);
    }

    
    function clear_map(){
        perim.remove();
        imgovrlay.remove();
        //bounds_rect.remove();
        loc_marker.remove();
        //map_obj.eachLayer((layer)=> layer.remove());
    }

    function draw_map(){
        clear_map();
        //map_tiles.addTo(map_obj);
        perim.addTo(map_obj);
        imgovrlay.addTo(map_obj);
        //bounds_rect.addTo(map_obj);
        loc_marker.addTo(map_obj);
    }

    function move_marker(loc){
        loc_marker.setLatLng(loc);
    }

    function showPlayButton() {
        const button = document.createElement('button');
        button.innerText = 'Click to Play';
        button.onclick = () => {
            stream.play();  // Attempt to play when the button is clicked
            button.remove();  // Remove the button after playback starts
        };
        document.body.appendChild(button);
    }

    function start_stream(){
        if(Hls.isSupported()) {
            hls = new Hls({maxBufferHole:2,debug:true});
            hls.on(Hls.Events.ERROR, function (event, data) {
                let errorType = data.type;
                let errorDetails = data.details;
                let errorFatal = data.fatal;
                console.log(errorType);
                console.log(errorDetails);
                console.log(errorFatal);
                if (data.fatal) {
                  switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                  // try to recover network error
                        console.log("fatal network error encountered, try to recover");
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log("fatal media error encountered, try to recover");
                        hls.recoverMediaError();
                        break;
                    default:
                    // cannot recover
                        hls.destroy();
                        break;
                  }
                }
            });
            hls.loadSource('/stream/stream.m3u8');
            hls.attachMedia(audio_element);
            audio_element.play();
            fadeIn(fade_time); 
        } 
        else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
            // This will run for Safari browsers
            audio_element.play();
            fadeIn(fade_time);
        }
    }

    function stop_stream() {
        fadeOut(fade_time);
        setTimeout(() => {
            audio_element.pause();
            if(hls){hls.destroy();}
            else {audio_element.src = '';}
        }, fade_time);
    }





    function on_new_location(new_loc, test){
        if(!test){move_marker(new_loc)}
        if(within_perim(new_loc)){
            if(!prev_loc_within_perim){
                console.log("perim enter!");
                start_stream();
            }
            prev_loc_within_map = true;
            prev_loc_within_perim = true;
            prev_loc = new_loc;
        }
        else if(within_map(new_loc)){
            if(!prev_loc_within_map){
                console.log("map enter!");
                draw_map();
            }
            if(prev_loc_within_perim){
                console.log("perim exit!");
                stop_stream();
            }
            prev_loc_within_map = true;
            prev_loc_within_perim = false;
            prev_loc = new_loc;
        }
        else {
            if(prev_loc_within_map){
                console.log("map exit!");
                clear_map();
                alert("Du är för långt bortom tidsstängslet! Ladda om sidan när du befinner dig på kartan!");
                

            }
            prev_loc_within_map = false;
            prev_loc_within_perim = false;
            prev_loc = new_loc;
        }
    }




    function track_location(test){

        if(test){
            loc_marker.on('dragend', function(event) {
                let new_loc = event.target.getLatLng();
                let dist = L.latLng(prev_loc).distanceTo(L.latLng(new_loc));
                if(dist >= loc_update_dist_thresh){
                    on_new_location(new_loc,true);
                }
            });
        }
        else {

            if(loc_watchId){navigator.geolocation.clearWatch(loc_watchId);}
            loc_watchId = navigator.geolocation.watchPosition(
                (new_loc)=> {
                    //console.log(new_loc);
                    let dist = L.latLng(prev_loc).distanceTo(L.latLng(newloc));
                    if(dist >= loc_update_dist_thresh){
                        on_new_location(new_loc,false);
                    }
                },
                (err)=> {
                    console.log(err);
                    //navigator.clearWatch(loc_watchId);
                    if(err.code === 1){
                        alert("Åtkomst till geoposition nekad! Aktivera åtkomst, ladda sedan om sidan");

                    }
                    if(err.code === 2){
                        alert("Okänt fel vid åtkomst av geoposition, försök igen genom att ladda om sidan!");

                    }
                    if(err.code === 3){
                        alert("Okänt fel vid åtkomst av geoposition, försök igen genom att ladda om sidan!");

                    }
                }, 
                {
                    enableHighAccuracy: true,   // Use GPS for more accurate results
                    timeout: 10000,              // Maximum wait time to get the position
                    maximumAge: 0               // Don't use cached position, always get fresh location
                }
            );
        }
    }
    /*
        Initializing and Browser Compability Checks
    */

    function stream_supported(){
        if(Hls.isSupported()){return true;} 
        else if (audio.canPlayType('application/vnd.apple.mpegurl')) {return true; }
        else {return false}
    }

    function initialize(){

        if(stream_supported()){
            if(navigator.geolocation){
                navigator.geolocation.getCurrentPosition(
                    (e)=> {
                        let p = {lat:e.coords.latitude,lng:e.coords.longitude};
                        if(within_map(p)){
                            prev_loc = p;
                            prev_loc_within_map = true;
                            map_obj.setView(map_default_center,minZoom);
                            map_tiles.addTo(map_obj);
                            imgovrlay.addTo(map_obj);
                            //bounds_rect.addTo(map_obj);
                            loc_marker = L.marker(prev_loc,{interactive:false}); 
                            perim.addTo(map_obj);
                            loc_marker.addTo(map_obj);
                            map_obj.setMaxBounds(map_bounds);
                            map_obj.fitBounds(map_bounds);
                            if(within_perim(p)){
                                prev_loc_within_perim = true;
                                start_stream();
                            }
                            track_location(test=false);
                        }
                        else {
                            map_obj.setView(map_default_center,minZoom);
                            map_tiles.addTo(map_obj);
                            map_obj.setMaxBounds(map_bounds);
                            map_obj.fitBounds(map_bounds);
                            alert("Du är för långt bortom tidsstängslet! Ladda om sidan när du befinner dig på kartan!");
                        }
                    },
                    (err)=> {
                        if(err.code === 1){
                            alert("Åtkomst till geoposition nekad! Aktivera åtkomst, ladda sedan om sidan");
    
                        }
                        if(err.code === 2){
                            alert("Okänt fel vid åtkomst av geoposition, försök igen genom att ladda om sidan!");
    
                        }
                        if(err.code === 3){
                            alert("Okänt fel vid åtkomst av geoposition, försök igen genom att ladda om sidan!");
    
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                )
            }
            else {
                alert("Din webbläsare stödjer ej platstjäster!");
            }
        }
        else {
            alert("Din webbläsare stödjer ej hls ljudkodec!");
        }
    }
    /*
    function initialize_test(){
        if(stream_supported()){
            let p = default_sim_loc;
            if(within_map(p)){
                prev_loc = p;
                prev_loc_within_map = true;
                map_obj.setView(map_default_center,minZoom);
                map_tiles.addTo(map_obj);
                imgovrlay.addTo(map_obj);
                //bounds_rect.addTo(map_obj)
                loc_marker = L.marker(prev_loc,{draggable:true}); 
                perim.addTo(map_obj);
                loc_marker.addTo(map_obj);
                map_obj.setMaxBounds(map_bounds);
                map_obj.fitBounds(map_bounds);
                if(within_perim(p)){
                    prev_loc_within_perim = true;
                    //start_stream();
                }
                track_location(test=true);
                center_btn.addEventListener("click",function(evt){
                    map_obj.setView(prev_loc,minZoom);
                });
            }
            else {
                map_obj.setView(center,zoom);
                map_tiles.addTo(map_obj);
                map_obj.setMaxBounds(map_bounds);
                map_obj.fitBounds(map_bounds);
                alert("Du är för långt bortom tidsstängslet! Ladda om sidan när du befinner dig på kartan!");
            }
        }
        else {
            alert("Din webbläsare stödjer ej hls ljudkodec!");
        }
    }
    */
    initialize();

}())