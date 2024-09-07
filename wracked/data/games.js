//Clone variable
function clone(obj) {
	let copy;

	// Handle the 3 simple types, and null or undefined
	if (null == obj || "object" != typeof obj) return obj;

	// Handle Date
	if (obj instanceof Date) {
		copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	// Handle Array
	if (obj instanceof Array) {
		copy = [];
		for (let i = 0, len = obj.length; i < len; i++) {
			copy[i] = clone(obj[i]);
		}
		return copy;
	}

	// Handle Object
	if (obj instanceof Object) {
		copy = {};
		for (let attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
		}
		return copy;
	}

	throw new Error("Unable to copy obj! Its type isn't supported.");
}
function getId(id,from){
	if(from !== undefined)
		return getId(from).getElementById(id);
	else
		return document.getElementById(id);
}
function pickRandom(arr,nb){
		if(arr !== undefined){
			if(nb === undefined){
				let results = [];
				let idRandom = random(0,arr.length-1);
				results.push(arr[idRandom]);
				arr.splice(idRandom,1);
				return {'pick':results,'arr':arr}
			}else{
				arr = clone(arr);
				let results = [];
				for(let i=0;i < nb; i++){
					if(arr.length > 0){
						let idRandom = random(0,arr.length-1);
						results.push(arr[idRandom]);
						arr.splice(idRandom,1);
					}
				}
				return {'pick':results,'arr':arr};
			}
		}
		return false;
}
function takeFromArray(arr,nb){
		if(arr !== undefined){
			arr = clone(arr);
			let results = arr.splice(0,nb);
			return {'pick':results,'arr':arr};
		}
		return false;
}
function random(min,max,float){
	if(min instanceof Array && min.length == 2)
		return random(min[0],min[1],max);

	if(float === undefined||!float)
		return Math.round(Math.random() * (parseInt(max)-parseInt(min)))+parseInt(min);
	else
		return Math.round(Math.random() * (parseInt(max)-parseInt(min)) * 100)/100+parseInt(min);
}
function arrayShuffle(array){
	let random = null;
	let index = array.length;
	while (index != 0) {
		random = Math.floor(Math.random() * index);
		index--;
		[ array[index], array[random] ] = [ array[random], array[index] ];
	}
	return array;
}

/* Game 1 Sort Boxes */
class game1{
	sizeX = 16;
	sizeY = 8;
	pathBlock = [];
	piecesAvailable = [];
	pieces = {
		/*11:{
			'src':'data/img/other/game/crate_1x1.jpg',
			'sizeX':1,
			'sizeY':1
		},*/
		21:{
			'src':'data/img/other/game/crate_2x1.jpg',
			'sizeX':2,
			'sizeY':1
		},
		22:{
			'src':'data/img/other/game/crate_2x2.jpg',
			'sizeX':2,
			'sizeY':2
		},
		31:{
			'src':'data/img/other/game/crate_3x1.jpg',
			'sizeX':3,
			'sizeY':1
		},
		32:{
			'src':'data/img/other/game/crate_3x2.jpg',
			'sizeX':3,
			'sizeY':2
		}
	};

	constructor(params){
		this.contenerId = params.contenerId;
		this.timerMax = params.timer;
		this.pourcentWin = params.pourcent;
		this.callBackAnchor = params.callBackAnchorId;
		this.callBackElement = params.callBackElementId;
		this.pathBlock[3] = [3,4,5,6,7,8,9,10,11,12,13,14,15];
		this.pathBlock[4] = [3,4,5,6,7,8,9,10,11,12,13,14,15];

		//CSS Rules
		let styleRules = `
			.green{
				text-weight:bold;
				color:#0D0;
			}
			.orange{
				text-weight:bold;
				color:#E60;
			}
			.red{
				text-weight:bold;
				color:#F00;
			}
			#boxPackMain{
				
			}
			#boxPackRules{
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
				align-items: center;
				gap: 10px;
				margin:10px 0px;
			}
			#boxPackRules .boxPackBlock{
				text-align: center;
			}
			#boxPackBoxesSelect{
				display: flex;
				flex-direction: row;
				justify-content: space-evenly;
				align-items: center;
				gap:10px;
			}
			#boxPackBoxesSelect span{
				height: 100px;
				width: 150px;
				border: 1px solid #000;
				padding: 5px;
				border-radius: 5px;
				display: flex;
				justify-content: center;
				align-items: center;
				align-content: center;
			}
			#boxPackBoxesSelect span img{
				cursor: pointer;
			}
			#boxPackMain img.focus{
				position: absolute!important;
				z-index: -1!important;
			}
			.darkmode #boxPackBoxesSelect span{
				border-color: #FFF;
			}
			#boxPack div.lineBoxPack{
				display:flex;
				flex-direction: row;
			}
			#boxPack div.cellBoxPack{
				border: 1px solid #000;
				box-sizing: border-box;
				width:50px;
				height:50px;
				//position:relative;
			}
			#boxPack div.cellBoxPack img{
				z-index:5;
				position:relative;
			}
			#boxPackMain img.boxPack_vertical_21{
				transform: rotate(0.25turn);
				top: 25px;
				left: -25px;
			}
			#boxPackMain img.boxPack_vertical_31{
				transform: rotate(0.25turn);
				top: 50px;
				left: -50px;
			}
			#boxPackMain img.boxPack_vertical_32{
				transform: rotate(0.25turn);
				top: 25px;
				left: -25px;
			}
			.darkmode #boxPack div.cellBoxPack{
				border-color: #FFF;
			}
			#boxPack div.lineBoxPack div.cellBoxPack.path{
				border: none;
				background-size: 50px 50px;
				background-repeat: no-repeat;
				background-image: url(data/img/other/game/case-walk.jpg);
			}
			#boxPackPresentation{
				border-color: #000;
				padding: 10px;
				border-radius: 10px;
				text-align: center;
				background-color: #255;
			}
			.darkmode #boxPackPresentation{
				border-color: #FFF;
			}
			#boxPackPresentation ul{
				text-align: left;
			}
			#boxStart{
				padding: 5px;
			}
		`;

		let newStyleSheet = document.createElement("style");
		newStyleSheet.innerText = styleRules;
		document.head.appendChild(newStyleSheet);

		this.presentation();
	}

	presentation(){
		let html = `<div id="boxPackPresentation">
						<p>You have to place as much boxes as possible before you have to go back to handle the customers, don't put boxes on the path of the room</p>
						<ul>
							<li>Click on a box to place it</li>
							<li>Right click to rotate it</li>
							<li>You can put back boxes or move it elsewhere</li>
							<li>With ">>" you can skip and select the next boxes</li>
						</ul>
						<button id="boxStart" class="btn">Start this chore</button>
					</div>`;

		getId(this.contenerId).innerHTML = html;
		getId('boxStart').onclick = this.start.bind(this);
	}

	start(){
		//Draw the board
		this.draw();

		//Choose the pieces
		this.generatePieces();

		//Init Controler
		this.controls();
	}

	draw(){
		let html = `<div id="boxPackMain">
						<div id="boxPackRules">
							<div class="boxPackBlock">
								<span id="boxPack_nbUsed"></span> / <span id="boxPack_nbTotal"></span>
								<br>
								<span id="boxPack_pourcent" class="red"></span>%
								<br>
								<span id="boxPack_timer"></span>secs
							</div>
							<div id="boxPackBoxesSelect" class="boxPackBlock">
								<span id="boxPack_case0"></span>
								<span id="boxPack_case1"></span>
								<span id="boxPack_case2"></span>
								<span id="boxPack_case3"></span>
							</div>
							<div class="boxPackBlock">
								<span id="boxPack_btn" class="btn">>></span>
							</div>
						</div>
						<div id="boxPack">`;
		for(let line=0;line < this.sizeY; line++){
			html += '<div class="lineBoxPack">';
			for(let column=0; column < this.sizeX; column++){
				if(this.pathBlock[line] !== undefined && this.pathBlock[line].indexOf(column) !== -1)
					html += '<div id="boxPack_'+column+'_'+line+'" class="cellBoxPack path"></div>';
				else
					html += '<div id="boxPack_'+column+'_'+line+'"class="cellBoxPack"></div>';
			}
			html += '</div>';
		}
		html += '</div></div>';
		getId(this.contenerId).innerHTML = html;
	}

	toggleFocusBoxes(elem){
		if(elem.classList.contains('focus')){
			elem.classList.remove('focus');
		}else{
			elem.classList.add('focus');
		}
	}

	generatePieces(){
		let blockUsed = clone(this.pathBlock);
		for(let x = this.sizeX-1;x >= 0; x--){
			for(let y = 0; y < this.sizeY; y++){
				if(blockUsed[y] !== undefined && blockUsed[y].indexOf(x) !== -1)
					continue;
				let setPiceces = arrayShuffle(Object.keys(this.pieces));
				for(let pieceId of setPiceces){
					let rotations = ['vertical','horizontal'];
					if(this.pieces[pieceId].sizeX == this.pieces[pieceId].sizeY)
						rotations = ['horizontal'];
					rotations = arrayShuffle(rotations);
					let isOk = true;
					for(let rotation of rotations){
						let infoPiece = clone(this.pieces[pieceId]);
						if(rotation == 'vertical'){
							let tmp = infoPiece.sizeX;
							infoPiece.sizeX = infoPiece.sizeY;
							infoPiece.sizeY = tmp;
						}
						let blockHereUsed = []
						let testX = x-(infoPiece.sizeX-1);
						let testY = (y+infoPiece.sizeY-1);
						if(testX < 0||testY >= this.sizeY){
							isOk = false;
							continue;
						}
						for(let tx = x;tx >= testX; tx--){
							for(let ty = y; ty <= testY; ty++){
								isOk = (blockUsed[ty] === undefined || blockUsed[ty].indexOf(tx) === -1);
								if(blockHereUsed[ty] === undefined)
									blockHereUsed[ty] = [];
								blockHereUsed[ty].push(tx);
								if(!isOk)break;
							}
							if(!isOk)break;
						}
						if(isOk){
							for(let line of Object.keys(blockHereUsed)){
								if(blockHereUsed[line] === undefined)
									continue;
								if(blockUsed[line] === undefined)
									blockUsed[line] = [];
								blockUsed[line] = blockUsed[line].concat(blockHereUsed[line]);
							}

							this.piecesAvailable.push(pieceId);

							//Show the picture
							//let xplace = x - (infoPiece.sizeX-1);
							//getId('boxPack_'+y+'_'+xplace).innerHTML = '<img class="boxPack_'+rotation+'_'+pieceId+'" src="'+infoPiece.src+'">';

							break;
						}
					}
					if(isOk)break;
				}
			}
		}
		this.piecesAvailable = arrayShuffle(this.piecesAvailable);
	}

	pickNewBoxes(){
		let resPick = takeFromArray(this.piecesAvailable,3);
		this.piecesAvailable = resPick.arr;
		for(let caseToShowId in resPick.pick){
			let pieceId = resPick.pick[caseToShowId];
			let infoPiece = clone(this.pieces[pieceId]);
			getId('boxPack_case'+caseToShowId).innerHTML = '<img class="boxPack_showCase" data-id="'+pieceId+'" src="'+infoPiece.src+'">';
		}
	}

	controls(){
		getId('boxPackMain').game = this;
		getId('boxPack_nbUsed').innerHTML = 0;
		getId('boxPack_nbTotal').innerHTML = this.piecesAvailable.length;
		getId('boxPack_pourcent').innerHTML = 0;
		getId('boxPack_timer').innerHTML = this.timerMax;
		
		this.pickNewBoxes();

		//Take other Boxes and put back the current ones
		getId('boxPack_btn').onclick = function(){
			let allCurrentBoxes = getId('boxPackBoxesSelect').querySelectorAll('span');
			for(let box of allCurrentBoxes){
				if(box.innerHTML !== ''){
					let dataId = box.querySelector('img').getAttribute('data-id');
					getId('boxPackMain').game.piecesAvailable.push(dataId);
					box.innerHTML = '';
				}
			}
			getId('boxPackMain').game.pickNewBoxes();
		}

		//Case with the boxes
		let areaBoxes = getId('boxPackBoxesSelect').querySelectorAll('span');
		for(let areaBox of areaBoxes){
			areaBox.onclick = function(){
				let focused = getId('boxPackMain').querySelector('img.focus');
				if(this.innerHTML !== '' && focused == null){
					getId('boxPackMain').game.toggleFocusBoxes(this.firstChild);
				}
				if(this.innerHTML === '' && focused !== null){
					this.appendChild(focused);
					getId('boxPackMain').game.toggleFocusBoxes(focused);
				}
			}
		}

		getId('boxPackMain').addEventListener('contextmenu', function(ev){
			ev.preventDefault();
			let imgToMove = getId('boxPackMain').querySelector('img.focus');
			if(imgToMove !== null){
				let dataId = imgToMove.getAttribute('data-id');
				imgToMove.classList.toggle('boxPack_vertical_'+dataId);
				imgToMove.classList.toggle('boxPack_vertical');
			}
			return false;
		}, false);

		//Pick up the boxes
		getId('boxPackMain').addEventListener("mousemove", (e) => {
			let imgToMove = getId('boxPackMain').querySelector('img.focus');
			if(imgToMove !== null){
				let offsetX = 25;
				let offsetY = 25;
				if(imgToMove.classList.contains('boxPack_vertical_21')){
					offsetX = 50;
					offsetY = 0;
				}
				if(imgToMove.classList.contains('boxPack_vertical_31')){
					offsetX = 75;
					offsetY = -25;
				}
				if(imgToMove.classList.contains('boxPack_vertical_32')){
					offsetX = 50;
					offsetY = 0;
				}
				imgToMove.style.top = (e.pageY-offsetY)+'px';
				imgToMove.style.left = (e.pageX-offsetX)+'px';
			}
		});

		//Place the boxes
		let cells = getId('boxPack').querySelectorAll('.cellBoxPack');
		for(let cell of cells){
			cell.onclick = function(){
				let imgToMove = getId('boxPackMain').querySelector('img.focus');

				let canPlace = (imgToMove !== null && !this.classList.contains('path') && this.innerHTML === '');
				if(canPlace){

					let typeBox = imgToMove.getAttribute('data-id');
					let checkX = parseInt(typeBox[0]);
					let checkY = parseInt(typeBox[1]);
					if(imgToMove.classList.contains('boxPack_vertical')){
						checkX = parseInt(typeBox[1]);
						checkY = parseInt(typeBox[0]);
					}

					//Check every Emplacement for the box
					let listPlacement = [];
					let locationId = this.getAttribute('id');
					let tmp = locationId.split('_');
					let hereX = parseInt(tmp[1]);
					let hereY = parseInt(tmp[2]);
					for(let testX=hereX; testX<=hereX+(checkX-1);testX++){
						for(let testY=hereY; testY<=hereY+(checkY-1);testY++){
							let here = getId('boxPack_'+testX+'_'+testY);
							if(here !== null){
								listPlacement.push('boxPack_'+testX+'_'+testY);
								let isUsed = here.getAttribute('used')!== null||here.classList.contains('path');
								if(isUsed){
									canPlace = false;
									break;
								}
							}else{
								canPlace = false;
								break;
							}
						}
						if(!canPlace)
							break;
					}

					if(canPlace){
						this.appendChild(imgToMove);
						getId('boxPackMain').game.toggleFocusBoxes(imgToMove);
						imgToMove.style.top = null;
						imgToMove.style.left = null;

						//Clean previous placements
						let previousPlacements = imgToMove.getAttribute('placements');
						if(previousPlacements !== null){
							previousPlacements = JSON.parse(previousPlacements);
							for(let placement of previousPlacements){
								getId(placement).removeAttribute('used');
							}
						}

						//Tag the placements
						for(let placement of listPlacement){
							getId(placement).setAttribute('used',1);
						}
						imgToMove.setAttribute('placements',JSON.stringify(listPlacement));

						//If not more Boxes ready select new ones
						let boxesAvailable = getId('boxPackBoxesSelect').querySelectorAll('img');
						if(boxesAvailable.length == 0)
							getId('boxPackMain').game.pickNewBoxes();
					}
				}
				if(imgToMove == null && this.innerHTML !== ''){
					getId('boxPackMain').game.toggleFocusBoxes(this.firstChild);
				}
			}
		}

		setTimeout(() => { this.countdownBoxes() }, 1000);
	}

	win(){
		getId(this.callBackAnchor)[this.callBackElement].gameWin();
	}

	lose(){
		getId(this.callBackAnchor)[this.callBackElement].gameLose();
	}

	countdownBoxes(){
		let timer = parseInt(getId('boxPack_timer').innerHTML);
		let imgPlaced = getId('boxPack').querySelectorAll('img');
		getId('boxPack_nbUsed').innerHTML = imgPlaced.length;
		let pourcentCurrent = Math.round(imgPlaced.length / parseInt(getId('boxPack_nbTotal').innerHTML) * 100);
		getId('boxPack_pourcent').innerHTML = pourcentCurrent;
		if(getId('boxPackMain').game.pourcentWin <= pourcentCurrent){
			getId('boxPack_pourcent').classList.remove('red');
			getId('boxPack_pourcent').classList.remove('orange');
			getId('boxPack_pourcent').classList.add('green');
		}else if(getId('boxPackMain').game.pourcentWin/2 <= pourcentCurrent){
			getId('boxPack_pourcent').classList.remove('red');
			getId('boxPack_pourcent').classList.remove('green');
			getId('boxPack_pourcent').classList.add('orange');
		}

		if(timer <= 0||pourcentCurrent == 100){
			if(getId('boxPackMain').game.pourcentWin <= pourcentCurrent){	//Win
				this.win();
			}else{															//Lose
				this.lose();
			}
		}else{
			getId('boxPack_timer').innerHTML = timer-1;
			setTimeout(() => { this.countdownBoxes() }, 1000);
		}
	}
}

/* Game 2 Spin Wheel */
class game2{
	parts = [
		{"id":"votes","name":"Votes ++","color":"#555"},
		{"id":"drink","name":"Drink Up","color":"#055"},
		{"id":"cam","name":"Cam Immunity","color":"#505"},
		{"id":"doctor","name":"Doctor Visit","color":"#550"},
		{"id":"show","name":"Do a Show","color":"#F55"},
	];
	configWheel = {
		4:{"offset":90,"angleCss":96},
		5:{"offset":117,"angleCss":80},
		6:{"offset":135,"angleCss":70},
		7:{"offset":147,"angleCss":63},
	};

	constructor(params){
		this.contenerId = params.contenerId;
		this.callBackAnchor = params.callBackAnchorId;
		this.callBackElement = params.callBackElementId;

		let angleCss = this.configWheel[this.parts.length].angleCss;

		//CSS Rules
		let styleRules = `
			#spinWheel{
				position: relative;
				display: flex;
				align-items: center;
				width: 100%;
				height: 100%;
				justify-content: center;
				user-select: none;
			}
			#wheelBtn{
				position: absolute;
				width: 15%;
				height: 15%;
				background-color: #FFF;
				border-radius: 50%;
				z-index:10;
				display: flex;
				align-items: center;
				justify-content: center;
				font-weight:bold;
				color: #000;
				box-shadow: 0px 0px 6px 1px #000;
				cursor:pointer;
			}
			#wheelBtn::after{
				content: ' ';
				position: absolute;
				width: 70%;
				height: 60%;
				background-color: #FFF;
				clip-path: polygon(25% 0, 50% 100%, 75% 0);
				bottom: -25px;
			}
			#wheel{
				position: absolute;
				overflow: hidden;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background-color: #F0F;
				border-radius: 50%;
				box-shadow: 0px 0px 0px 5px #F8F,0px 0px 0px 6px #000, 0px 0px 10px 5px #000;
				transition: none;
			}
			#wheel .slice{
				position: absolute;
				display: flex;
				align-items: center;
				width: 50%;
				height: 50%;
				background-color: var(--color);
				transform-origin: bottom right;
				transform: rotate(calc(var(--index) * var(--deg)));
				clip-path: polygon(0 0, `+angleCss+`% 0%, 100% 100%, 0% `+angleCss+`%);
				justify-content: center;
			}
			#wheel .slice span{
				position: relative;
				transform: rotate(45deg);
				font-size: 1.5em;
				font-weight: bold;
				text-shadow: 0px 0px 2px #fff,0px 0px 2px #fff,0px 0px 2px #fff,0px 0px 2px #fff;
				width: 50px;
				text-align: justify;
				color: #000;
			}
		`;

		let newStyleSheet = document.createElement("style");
		newStyleSheet.innerText = styleRules;
		document.head.appendChild(newStyleSheet);

		this.presentation();
	}

	presentation(){
		let html = `<div id="boxPackPresentation">
						<button id="gameStart" class="btn">Try yourself</button>
					</div>`;

		getId(this.contenerId).innerHTML = html;
		getId('gameStart').onclick = this.start.bind(this);
	}

	start(){
		//Draw the board
		this.draw();

		//Init Controler
		this.controls();
	}

	draw(){
		let partsContent = [];
		let degRotation = 360/this.parts.length;
		for(let partId in this.parts){
			let part = this.parts[partId];
			partsContent.push('<div class="slice" style="--color:'+part.color+';--deg:'+degRotation+'deg;--index:'+(parseInt(partId)+1)+'"><span>'+part.name+'</span></div>');
		}
		let html = `
			<div id="spinWheel">
				<div id="wheelBtn">Play!</div>
				<div id="wheel">`+partsContent.join('')+`</div>
			</div>
		`;
		getId(this.contenerId).innerHTML = html;
	}

	controls(){
		getId('spinWheel').game = this;
		let angle = (360 / getId('spinWheel').game.parts.length);
		let offset = this.configWheel[this.parts.length].offset;
		let spinValue = offset;
		getId('wheel').style.transform = 'rotate('+spinValue+'deg)';
		getId('wheel').style.transition = 'transform 4s ease-in-out';
		
		//Make the Wheel spin
		getId('wheelBtn').onclick = function(){
			spinValue = Math.ceil(Math.random()*3600 + 360);
			getId('wheel').style.transform = 'rotate('+(spinValue+offset)+'deg)';
			getId('wheelBtn').onclick = null;

			let tabResult = clone(getId('spinWheel').game.parts);
			tabResult.push(tabResult.shift());
			tabResult = tabResult.reverse();
			let result = Math.floor( (spinValue%360) / angle);

			getId('spinWheel').game.win(tabResult[result]);
		}
	}

	win(elem){
		let findBtnToActivate = getId(this.contenerId).parentNode.querySelector('.btnEventContinue[data-use="'+elem.id+'"]');
		removeClass(findBtnToActivate,'hide');
	}
}