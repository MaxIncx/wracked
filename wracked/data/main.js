var language = 'english';
const storagePrefix = 'insertStory_';
var profileId = null;
var observers = {};		//List of observers

const elemsToSave = [
					'difficulty',
					'gameState',
					'characters',
					'backPage',
					'currentPage',
					'villa',
					'trapUsed',
					'probaDream',
					'eventsCooldown',
					'characterSec'
				];

//To debug Hallway Event
//const forceEventLvl = 'hard';		//simple,soft,standard,hard
//const forceEventBehavior = 'nympho';
//const forceEventId = 'set2';

//const  forceNextEvents = 'wheeloffortune';

//const forceDream = 'spa';

//const forceNoPicture = true;

/******************************/
/********* CLASSES ************/
/******************************/

class Character{
	constructor(params){
		if(params !== undefined){
			this.id = null;
			this.wasMan = false;

			if(params.idChar !== undefined){
				this.id = params.idChar;
				if(params.idChar !== 'player' && getCharacter(params.idChar) !== false){
					let nbChar = Object.keys(getStorage('characters')).length;
					if(nbChar === undefined)
						nbChar = 0;
					this.id += '_'+nbChar;
				}
			}

			this.gender = 'woman';
			if(params.gender !== undefined && params.gender == 'man')
				this.wasMan = true;

			if(params.hairColor !== undefined)
				this.hairColor = params.hairColor;

			if(params.firstname !== undefined){
				if(this.wasMan){
					this.firstnameMan = params.firstname;
					this.firstname = pickRandom(clone(window.database.characterInfo.femaleNames));
				}else{
					this.firstname = params.firstname;
				}
			}
			if(params.lastname !== undefined)
				this.lastname = params.lastname;

			if(params.archetype !== undefined)
				this.archetype = params.archetype;

			if(params.behavior !== undefined)
				this.behavior = params.behavior;

			this.info = {};

			this.dateStart = getStorage('dayNumber');
			if(this.id !== 'player'){
				this.findProfile();

				this.stage = 0;
				this.out = false;
			}else{
				this.votes = 0;
				this.fans = 0;
				this.matchArchetype(params);

				this.bimbo = 0;				//Current points
				this.slut = 0;
				this.bimboStage = 1;		//Definitive Stage pass by point threshold
				this.slutStage = 1;
				this.giveState('bimbo');	//Temporaly State according to the current points
				this.giveState('slut');
				this.changeStageDay = 0;	//When the last Stage change

				//Define if you need to buy Improvements
				this.boobsCrave = 0;
				this.makeupCrave = 0;
				this.sexCrave = 0;

				this.inventory = {};

				this.stats = {
					'masturbated':0,
					'dreams':{},
					'trapSetup':0,
					'trapSuccess':0,
					'trapYourself':0,
					'trapFailure':0,
					'totalFansGain':0,
					'totalSlutGain':0,
					'totalBimboGain':0,
					'totalVoteGain':0,
					'totalVoteFromFans':0,
					'totalVoteStoled':0,
					'totalVoteSpend':0,
					'archetypeUsed':{},
					'nbMorph':0,
					'aimessing':{},
					'soloActivity':{},
					'participateActivity':{},
					'ambush':{},
					'nbambush':0,
					'eventOtherEncountered':{},
					'counter':{'fail':0,'win':0},
					'loadgame':0,
					'objectBuy':{},
					'cheats':{},
					'cheatsCurrent':{},
					'dayWithoutCheating':0,
					'nbBlowjobs':0,
					'nbSex':0
				};
				this.stats.archetypeUsed[this.archetype] = 1;

				this.definePseudo();
				this.updateMorning();
			}

			//Choose Set for Activities
				this.activities = this.chooseActivitiesSet();

			//Perks
				if(params.perks !== undefined){
					let perksMax = window.database.creation.perksMax;
					if(params.perks.indexOf('crazyworld') !== -1)
						perksMax++;
					if(params.perks.length > perksMax){
						this.addPerks(['alpha']);
					}else{
						this.addPerks(params.perks);
					}
				}

			//Find a profile Pict
			this.giveFace();

			//Generate information
			this.fillInfo();
			this.setUpBody();

			this.save();
		}
	}

	chooseActivitiesSet(){
		let archetypeInfo = window.database.participants[this.archetype];
		let listActivities = [];
		let locations = window.database.locations;
		for(let locaId in locations){
			if(locations[locaId].activities !== undefined){
				listActivities = [...listActivities,...Object.keys(locations[locaId].activities)];
			}
		}
		let activities = {};
		for(let activityId of listActivities){
			if(archetypeInfo.activities !== undefined && archetypeInfo.activities[activityId] !== undefined){
				activities[activityId] = pickRandom(Object.keys(archetypeInfo.activities[activityId]));
			}
		}
		return activities;
	}
	getFormal(force){
		if(this.gender == 'man'||(force !== undefined && force == 'man')){
			return ucfirst(getTrad('peoplestuff.mr'));
		}else{
			if(this.typeBody == 'milf')
				return ucfirst(getTrad('peoplestuff.mrs'));
			else
				return ucfirst(getTrad('peoplestuff.miss'));
		}
	}
	addSchedule(time,actionId){
		let actions = window.database.actions;
		if(this.schedule === undefined)
			this.schedule = {};
		this.schedule[time] = {"id":actionId,"location":actions[actionId].location,"activityId":actions[actionId].activity};
		this.save();
	}
	getCurrentActivity(){
		let time = getStorage('gameState').time;
		return this.schedule[time].activityId;
	}
	definePseudo(){
		if(this.gender == 'man'){
			this.pseudo = 'guy';
		}else{
			//Get with condition (first match is kept)
			let pseudoList = window.database.pseudoRanges;
			for(let pseudoId in pseudoList){
				let pseudoData = pseudoList[pseudoId];
				//SlutMin,SlutMax,BimboMin,BimboMax
				if(pseudoData.range !== undefined && pseudoData.range.length > 0){
					if(!( (pseudoData.range[0] <= this.giveSlut() && this.giveSlut() <= pseudoData.range[1]) &&
						(pseudoData.range[2] <= this.bimbo && this.bimbo <= pseudoData.range[3])
						))
						continue;
				}
				if(pseudoData.perks !== undefined && pseudoData.perks.length > 0){
					let inter = arrayInter(this.perks,pseudoData.perks);
					if(inter.length == 0)
						continue;
				}
				this.pseudo = pseudoId;
				break;
			}			
		}
	}
	getNameDisplay(){
		let pseudoName = ucfirst(getTrad('pseudo.'+this.pseudo));
		if(this.pseudo == 'guy'){
			pseudoName = ucfirst(getTrad('basic.theman'))+' '+ucfirst(getTrad('jobs.'+this.trueJob+'.name'));
			addClass(getId('nameChar'),'normalName');
		}else{
			pseudoName = ucfirst(getTrad('basic.thegirl'))+' '+pseudoName;
			if(this.wasMan && this.pseudo == 'girl'){
				pseudoName += '?!';
			}
			removeClass(getId('nameChar'),'normalName');
		} 
			
		return this.firstname+'<br>'+pseudoName;
	}
	getName(){
		if(this.id == 'player')
			return ucfirst(getTrad('basic.you'));
		else
			return this.firstname+' '+this.lastname;
	}
	giveState(type){
		let value = normalize(this[type] + ( (this[type+'Stage']-1) * 10),0,100);	//If you're at stage 1 => Add 15%
		let ranges = window.database[type+'Ranges'];
		for(let rangeId in ranges){
			let range = ranges[rangeId];
			if(range[0] <= value && value <= range[1]){
				this[type+'State'] = rangeId;
				break;
			}
		}
		if(this.havePerk('tease') && type == 'slut'){
			let rangesKey = Object.keys(window.database[type+'Ranges']);
			let next = rangesKey.indexOf(this[type+'State']) + 1;
			if(rangesKey[next] !== undefined)
				this[type+'State'] = rangesKey[next];
		}
	}
	getStateProfile(type = 'lasting'){
		let setPict = window.database.participants[this.archetype].profilePicts[this.profilePictsSet];
		let state = 1;
		if(type == 'actual'){	//Try to have picture more dependent of the actual "mood"
			state = normalize(Math.ceil((this.bimbo+this.giveSlut() + ((this.bimboStage+this.slutStage-2)*0.10) )/2),0,100) / 100;
			state = Math.round(setPict.length * state);
		}else{
			state = Math.ceil((this.bimboStage+this.slutStage)/2) - 1;
		}
		if(state >= setPict.length)
			state = setPict.length - 1;
		return state;
	}
	saveProfile(state = null){
		if(state !== null){
			this.stateProfile = state;
			this.generateTestimonial();
			this.save();
		}

		this.previousProfile.push(characterDetailsData(this.id));

		this.save();
	}
	changePassion(){
		let behaviorData = window.database.behaviors[this.behavior];

		let addPassion = behaviorData.stageChange.addPassion;
		if(this.havePerk('crazyworld'))
			addPassion = window.database.crazyworld.addPassion;

		let arrDiff = arrayDiff(addPassion,this.passionsTransformed);
		if(random(0,1)||arrDiff.length == 0){
			let passionsTransition = clone(window.database.passionsTransition);
			if(this.havePerk('crazyworld'))
				passionsTransition = arrayFlip(passionsTransition);
			let countPassion = this.passions.length;
			let passionExtract = this.passions.splice(random(0,countPassion-1),1);
			if(passionExtract.length > 0 && this.passionsTransformed.indexOf(passionsTransition[passionExtract]) === -1)
				this.passionsTransformed.push(passionsTransition[passionExtract]);
		}else{
			this.passionsTransformed.push(pickRandom(arrDiff));
		}
	}
	addStage(){
		let archetypePicts = window.database.participants[this.archetype].picts;
		let behaviorData = window.database.behaviors[this.behavior];
		let nbStage = window.database.difficulty[getStorage('difficulty')].nbStage;

		//Don't overdo
		if(this.stage == nbStage)
			return false;

		this.stage++;
		if(this.stage >= nbStage){
			this.out = true;
			this.dateOut = getStorage('gameState').dayNumber;
			this.stage = nbStage;
			this.giveFace();
		}else{
			this.pict = archetypePicts[this.pictList[ this.stage ]];
		}

		//Change Passions or add new one
		this.changePassion();

		//Change IQ
		let totalIqToDelete = (this.startStats.iq-70);
		let iqToDelete = Math.round(totalIqToDelete / nbStage);
		this.iq -= iqToDelete;

		//Change Sexual Pref
		if(random(1,3) == 3||this.sexualPref == 'asexual'){
			let indexNow = behaviorData.stageChange.sexualPref.indexOf(this.sexualpref);
			if(indexNow === -1||indexNow < behaviorData.stageChange.sexualPref.length-1){
				this.sexualpref = behaviorData.stageChange.sexualPref[indexNow+1];
			}
		}

		//Change Testimonial & Album
		this.generateTestimonial();

		this.save();

		//Save new Profile Info
		this.saveProfile();
	}
	generateTestimonial(){
		let tmpTestimonial = {};
		let albumPicture = [];

		//Find parts
		let paths = {
			'start':'profile.testimonial.start',
			'testi':'behaviors.default.testimonial',
			'end':'profile.testimonial.end'
		};

		if(window.translation[language].behaviors[this.behavior] !== undefined){
			if(window.translation[language].behaviors[this.behavior].starttestimonial !== undefined){
				paths.start = 'behaviors.'+this.behavior+'.starttestimonial';
			}
			if(window.translation[language].behaviors[this.behavior].testimonial !== undefined){
				paths.testi = 'behaviors.'+this.behavior+'.testimonial';
			}
			if(window.translation[language].behaviors[this.behavior].endtestimonial !== undefined){
				paths.end = 'behaviors.'+this.behavior+'.endtestimonial';
			}
		}

		for(let part of Object.keys(paths)){
			let path = paths[part];

			let choices = gObj(window.translation[language],path);
			let typeChoice = givePartToUsed(choices,this,'testimonial');
			tmpTestimonial[part] = getTrad(path+'.'+typeChoice,this);
		}

		//Album
		let albumChar = gObj(window.database,'participants.'+ this.get('archetype') +'.album');
		if(albumChar !== undefined && Object.keys(albumChar).length > 0){
			let pictChoice = givePartToUsed(albumChar,this,'album');
			let pictChoosed = pickRandom(albumChar[pictChoice],3);
			for(let pictInfo of pictChoosed){
				albumPicture.push('<div class="album"><img src="'+pictInfo.pict+'"><div class="albumName">'+getTrad(pictInfo.name,this)+'</div></div>');
			}
		}

		//Passions Album
		let arrPassions = arrayConcat(this.passions,this.passionsTransformed);
		for(let passionId of arrPassions){
			if(albumPicture.length < window.database.albumPicture && window.database.album[passionId] !== undefined && window.database.album[passionId].length > 0){
				let pictChoose = pickRandom(window.database.album[passionId]);
				let titleChoose = getTrad('profile.passions.'+passionId);
				albumPicture.push('<div class="album"><img src="'+pictChoose+'"><div class="albumName">'+titleChoose+'</div></div>');
			}
		}
		//Passions Desc
		let passionsKept = pickRandom(arrPassions,random(2,3));
		tmpTestimonial['passions'] = [];
		for(let passionId of passionsKept){
			tmpTestimonial['passions'].push(getTrad('profile.testimonial.passions.'+passionId,this));
		}

		this.testimonial = '<p>'+tmpTestimonial.start+' '+tmpTestimonial.testi+'</p><p>'+tmpTestimonial.passions.join('</p><p>')+'</p><p>'+tmpTestimonial.end+'</p>';

		//Generate Album
		albumPicture = arrayShuffle(albumPicture);
		this.album = albumPicture.join('');
	}
	giveHypnoFace(){
		let nbStage = window.database.difficulty[getStorage('difficulty')].nbStage;
		if(window.database.participants[this.archetype].hypnoPortrait === undefined)
			return '';
		let pictsAvailable = window.database.participants[this.archetype].hypnoPortrait[this.hypnoFaceSet];

		let nameStage = this.pictList[ this.stage ];
		if(nameStage === undefined){
			let keys = Object.keys(this.pictList);
			nameStage = this.pictList[keys[keys.length-1]];
		}
		if(pictsAvailable[ nameStage ] === undefined){
			let keys = Object.keys(pictsAvailable);
			return pictsAvailable[ keys[keys.length-1] ];
		}
		return pictsAvailable[ nameStage ];
	}
	giveFace(){
		if(this.id == 'player'){
			this.pict = window.database.participants[this.archetype].picts[this.bimboState];
		}else{
			let pictsAvailable = window.database.participants[this.archetype].picts;
			if(this.out){
				this.pict = pictsAvailable.out;
			}else{
				let nbStage = window.database.difficulty[getStorage('difficulty')].nbStage;
				if(this.pictList === undefined){
					let pictsId = Object.keys(pictsAvailable);
					pictsId.splice(pictsId.length-2,2);	//Remove the "out"
					let choosed = pickRandom(pictsId,nbStage);
					this.pictList = arrayInter(pictsId,choosed);
				}
				this.pict = pictsAvailable[ this.pictList[ this.stage ] ];
			}
		}
	}

	addInventory(item){
		let actions = clone(window.database.actions);
		this.inventory[item] = actions[item];
		this.inventory[item].modified = false;
		this.save();
	}
	addObject(id,invert = false){					//Add an object into the inventory or use it
		let buyable = clone(window.database.buyable);

		if(this.inventory[id] === undefined && (buyable[id].quantity !== undefined||buyable[id].stage !== undefined)){
			if(invert)
				delete this.inventory[id];
			else
				this.inventory[id] = buyable[id];
		}

		if(this.inventory[id] !== undefined){
			if(this.inventory[id].quantity !== undefined && buyable[id].quantity == 0){
				this.inventory[id].quantity += (invert ? -1 : 1);
			}
			if(this.inventory[id].stage !== undefined){
				if(invert){
					if(this.inventory[id].stage > 0){
						this.inventory[id].stage -= 1;
						if(id == 'boobsenlargement'){
							this.changeCloth('topCloth','decrease');
						}
					}
				}else{
					if(this.inventory[id].stage < this.inventory[id].maxStage){
						this.inventory[id].stage += 1;
						if(id == 'boobsenlargement'){
							this.changeCloth('topCloth','increase');
						}
					}
				}
			}
		}

		//Set to the supposed size with augment (after scientistfail)
		if(id == 'boobsrejuv'){
			let sizeBoobs = clone(window.database.boobsSize);
			let sizeBaseArchetype = window.database.participants[this.archetype].sizeBoobs;
			let enlargementLvl = (this.inventory.boobsenlargement !== undefined ? this.inventory.boobsenlargement.stage : 0);
			let missing = sizeBoobs.indexOf(sizeBaseArchetype)+enlargementLvl - sizeBoobs.indexOf(this.sizeBoobs);
			this.changeCloth('topCloth','increase',missing);
		}
	}
	buyItem(id){					//Pay and add an object into the inventory or use it
		let buyable = clone(window.database.buyable);
		let item = buyable[id];
		let price = parseFloat(getPrice(id));

		this.addObject(id);

		this.votes -= price;

		//Stats
		this.stats.totalVoteSpend += price;
		if(this.stats.objectBuy[id] === undefined)
			this.stats.objectBuy[id] = 0;
		this.stats.objectBuy[id] += 1;

		if(item.linkTo !== undefined){
			this.addObject(item.linkTo,true);
		}
		//Reset the crave
		if(item.crave !== undefined)
			this[item.crave] = 0;
		//Reset Stats
		if(item.reset !== undefined){
			let resetValue = (this.havePerk('crazyworld') ? 100 : 0);
			if(this.havePerk('betterbimbobody') && ['slut','bimbo'].indexOf(item.reset) !== -1)
				resetValue = (this.havePerk('crazyworld') ? 66 : 33);
				
			this[item.reset] = resetValue;

			this.giveState(item.reset);
			this.giveFace();
		}

		this.save();
	}
	modItem(id){
		this.inventory[id].modified = true;
		this.save();

		let actions = clone(window.database.actions);
		this.removeInventory(actions[id].object);
	}
	removeInventory(item){
		if(this.inventory[item].quantity !== undefined){
			this.inventory[item].quantity -= 1;
		}else{
			delete this.inventory[item];
		}
		this.save();
	}
	doHave(item){
		if (this.inventory[item] !== undefined && (this.inventory[item].quantity === undefined||this.inventory[item].quantity > 0))
			return this.inventory[item];
		else
			return false;
	}
	giveActivity(id){
		if(this.activities[id] !== undefined){
			let nbStage = window.database.difficulty[getStorage('difficulty')].nbStage;
			let pictsAvailable = window.database.participants[this.archetype].activities[id][this.activities[id]];

			let stageUse = this.stage;
			if(this.id == 'player'){
				if(this.havePerk('exhibitionist')||this.havePerk('naturist')){
					stageUse = pictsAvailable.length-1;
				}else{
					stageUse = this.getStateProfile('actual');
				}
			}
			switch(nbStage == 3){
				case 2:
					switch(stageUse){
						case 1:return pictsAvailable[0];break;
						case 2:return pictsAvailable[3];break;
					}
					break;
				case 3:
					switch(stageUse){
						case 1:return pictsAvailable[0];break;
						case 2:return pictsAvailable[2];break;
						case 3:return pictsAvailable[3];break;
					}
					break;
				default:
					if(stageUse >= 5)
						return pictsAvailable[pictsAvailable.length-1];
					else	
						return pictsAvailable[ stageUse ];
					break;
			}
		}else{
			return false;
		}
	}
	giveSlut(){								//Give the slut score for actions
		let slutIndex = this.slut;
		if(this.havePerk('tease'))
			slutIndex = (slutIndex + 20 > 100 ? 100 : slutIndex + 20);
		return slutIndex;
	}
	giveExitation(){

		return (this.bimbo+this.giveSlut()) / 2;
	}
	getExistingElements(){
		let info = {'namesUsed':[], 'archetypeUsed':[]};
		let characters = getStorage('characters');
		for(let char in characters){
			let charInfo = characters[char];
			info.namesUsed.push(charInfo.firstname+' '+charInfo.lastname);
			if(charInfo.archetype !== undefined)
				info.archetypeUsed.push(charInfo.archetype);
		}
		return info;
	}
	matchArchetype(params){

		let infoArchetype = null;
		let participantsData = clone(window.database.participants);
		let typeCloth = 'normal';
		let manToWomanPhysic = 'petite';
		if(params.perks !== undefined && params.perks.indexOf('crazyworld') !== -1){
			manToWomanPhysic = 'bimbo';
			let bottomType = clone(window.database.bottomType);
			typeCloth = bottomType[bottomType.length-1];
		}

		if(this.archetype === undefined || this.wasMan == true){

			let skinHere = 'default';
			if(this.archetype !== undefined && this.wasMan == true){
				let tmp = this.archetype.split('-');
				skinHere = tmp[1];
				this.pictMan = window.database.creation.body[tmp[1]].menProfile[tmp[2]][tmp[3]];
			}

			let archetypeAvailable = archetypeDispo();

			let archetypePlayer = [];

			//Check if possible, if nothing match try with less conditions
			let checks = ['typeBody','hairColor','skin','available'];
			while(archetypePlayer.length == 0 && checks.length > 0){
				for(let participantId in participantsData){
					let data = participantsData[participantId];
					if(data.color === undefined)
						data.color =  'default';

					if(checks.indexOf('available') !== -1 && archetypeAvailable.indexOf(participantId) === -1)
						continue;

					if(checks.indexOf('skin') !== -1 && data.color !== skinHere)
						continue;

					if(checks.indexOf('hairColor') !== -1 && data.hairColor != this.hairColor)
						continue;

					if(checks.indexOf('typeBody') !== -1 && data.typeBody !== manToWomanPhysic)
						continue;

					if(data.profilePicts === undefined)
						continue;

					archetypePlayer.push(participantId);
				}

				if(checks.length == 0)
					break;

				checks.splice(0,1);
			}
			this.archetype = pickRandom(archetypePlayer);
		}

		infoArchetype = window.database.participants[this.archetype];
		this.trueJob = 'itconsultant';

		if(infoArchetype.color !== undefined)
			this.color = infoArchetype.color;

		this.bottomType = 'normal';
		this.sizeBoobs = participantsData[this.archetype].sizeBoobs;

		//Select the camsPhoto set
		let camsPhotoSets = Object.keys(window.database.participants[this.archetype].camsPhoto);
		this.camsPhotoId = pickRandom(camsPhotoSets);

		//Pick a set of cloth
		let topSets = getClothes('topCloth',this.sizeBoobs,false,infoArchetype.color);
		this.topCloth = pickRandom(topSets);

		let bottomSets = getClothes('bottomCloth',this.bottomType,false,infoArchetype.color);
		this.bottomCloth = pickRandom(bottomSets);

		this.faceless = pickRandom(window.database.fleshrealmData.facelessPlayer[this.hairColor]);

		this.starting = {
			'archetype':this.archetype,
			'transfoMention':0,				//How many times the IA mention your transformation
		};

		if(this.wasMan){

			let typeSkin = (infoArchetype.color !== undefined ? infoArchetype.color : 'default');
			if(this.pictMan === undefined){
				this.pictMan = pickRandom(window.database.creation.body[typeSkin].menProfile[this.hairColor]);
			}

			if(this.starting.face === undefined){
				this.starting.face = this.pictMan;

				let typeTorso = pickRandom(Object.keys(window.database.creation.body[typeSkin].mentorso));
				this.starting.torsoType = typeTorso;
				this.starting.torsoPict = pickRandom(window.database.creation.body[typeSkin].mentorso[typeTorso]);

				let typeBottom = pickRandom(Object.keys(window.database.creation.body[typeSkin].menbottom));
				this.starting.typeBottom = typeBottom;
				this.starting.bottomPict = pickRandom(window.database.creation.body[typeSkin].menbottom[typeBottom]);
			}
		}else if(this.starting.face === undefined){
			this.starting.face = window.database.participants[this.archetype].picts.base;
			let pictsBoobsList = this.picturesTypes('topCloth');
			this.starting.torsoType = this.sizeBoobs;
			this.starting.torsoPict = pictsBoobsList[pictsBoobsList.length -1];

			let pictsBottomsList = this.picturesTypes('bottomCloth');
			this.starting.typeBottom = this.bottomType;
			this.starting.bottomPict = pictsBottomsList[pictsBottomsList.length -1];
		}

		if(params.perks !== undefined && params.perks.indexOf('crazyworld') !== -1){
			this.bottomType = typeCloth;
			let bottomSets = getClothes('bottomCloth',this.bottomType,false,infoArchetype.color);
			this.bottomCloth = pickRandom(bottomSets);
		}
	}
	giveClothImg(type,isView = false){
		let picts = null;
		if(type == 'bottomCloth'){
			let tmp = this[type].split('_');
			if(tmp.length > 1){
				picts = window.database.cloth[type][tmp[0]][tmp[1]].display;
			}else{
				picts = window.database.cloth[type][this.bottomType][this[type]].display;
			}
		}else{
			let setFamily = type;
			if(isView)
				setFamily = 'view';
			let tmp = this[type].split('_');
			if(tmp.length > 1){
				picts = window.database.cloth[setFamily][tmp[0]][tmp[1]].display;
			}else{
				picts = window.database.cloth[setFamily][this.sizeBoobs][this[type]].display;
			}
		}

		if(picts !== undefined && picts.length > 0){
			if(this.havePerk('exhibitionist')||this.havePerk('naturist')){
				return picts[picts.length-1];
			}else{
				let slutIndice = (this.giveSlut() >= 100?99:this.giveSlut());
				let step = Math.round(100 / picts.length);
				let index = Math.floor(slutIndice / step);
				return picts[index];
			}
		}else{
			return false;
		}
	}
	picturesTypes(type,fieldValSet){		//Give the picture of the clothes
		if(fieldValSet === undefined)
			fieldValSet = type;

		let test = this[fieldValSet].split('_');
		if(test.length > 1){
			return window.database.cloth[type][test[0]][test[1]].display;
		}else{
			let kind = (type == 'topCloth' ? 'sizeBoobs' : 'bottomType');
			if(fieldValSet == 'oldBoobsSet')
				kind = 'oldBoobsSize';
			return window.database.cloth[type][this[kind]][this[fieldValSet]].display;
		}
	}
	findArchetype(archetypeUsed){
		let archetypeAvailable = archetypeDispo();

		let archetypeKept = [];
		let participantsData = window.database.participants;
		for(let participantId in participantsData){
			let data = participantsData[participantId];

			if(archetypeAvailable.indexOf(participantId) === -1)
				continue;

			if(this.hairColor !== undefined && this.hairColor != data.hairColor)
				continue;

			if(archetypeUsed.length > 0 && archetypeUsed.indexOf(participantId) !== -1)
				continue;

			archetypeKept.push(participantId);
		}
		this.archetype = pickRandom(archetypeKept);
	}
	findName(namesUsed){
		this.lastname = pickRandom(clone(window.database.characterInfo.lastNames));
		
		let iteration = 0;
		while(this.firstname === undefined && iteration < 100){
			if(this.gender == 'man'){
				this.firstname = pickRandom(clone(window.database.characterInfo.maleNames));
			}else{
				this.firstname = pickRandom(clone(window.database.characterInfo.femaleNames));
			}

			//Avoid duplicate
			if(namesUsed.indexOf(this.firstname+' '+this.lastname) != -1)
				delete this.firstname;
			iteration++;
		}
		if(iteration >= 100)
			console.log('Error: Name Overflow');
	}
	findProfile(){				//Define Housemates
		let existingElements = this.getExistingElements();

		//Name
			this.findName(existingElements.namesUsed);

		//Archetype
			if(this.archetype === undefined)
				this.findArchetype(existingElements.archetypeUsed);
	}
	setUpBody(){				//Set Hair Color, Type Body, Hypno Portrait & Outside Perks
		//Hair Color
		if(this.hairColor === undefined)
			this.hairColor = window.database.participants[this.archetype].hairColor;

		//Type Body
		this.typeBody = window.database.participants[this.archetype].typeBody;

		//HypnoFace
		if(window.database.participants[this.archetype].hypnoPortrait !== undefined){
			this.hypnoFaceSet = pickRandom(Object.keys(window.database.participants[this.archetype].hypnoPortrait));
		}

		//Add Perk
		if(this.id == 'player' && this.starting !== undefined && this.starting.archetype != this.archetype){
			for(let perk of window.database.participants[this.archetype].perks){
				this.addPerks(perk);
			}
		}

		//Set Profile Face
		if(window.database.participants[this.archetype].profilePicts !== undefined && Object.keys(window.database.participants[this.archetype].profilePicts).length > 0){
		 	this.profilePictsSet = pickRandom(Object.keys(window.database.participants[this.archetype].profilePicts));
		}

		//Set up age
		this.age = random(window.database.participants[this.archetype].ageRange[0],window.database.participants[this.archetype].ageRange[1]);
		if(this.starting !== undefined && this.starting.age === undefined)
			this.starting.age = this.age;
		this.giveBirthday();

		if(this.havePerk('crazyworld')){
			let pictsBoobsList = this.picturesTypes('topCloth');
			let pictsBottomsList = this.picturesTypes('bottomCloth');
			this.startingCrazyworld = {
				'face':this.getFace(),
				'torsoType':this.sizeBoobs,
				'torsoPict':pictsBoobsList[pictsBoobsList.length -1],
				'typeBottom':this.bottomType,
				'bottomPict':pictsBottomsList[pictsBottomsList.length -1],
			}
		}
	}
	fillInfo(){
		this.city = pickRandom(window.database.characterInfo.cities);
		if(this.passions === undefined)
			this.passions = [];
		if(this.passionsTransformed === undefined)
			this.passionsTransformed = [];
		this.previousProfile = [];

		if(this.behavior !== undefined){
			let behaviorData = window.database.behaviors[this.behavior];
			this.job = pickRandom(behaviorData.jobs);
			this.iq = random(behaviorData.iq[0],behaviorData.iq[1]);
			let nbPassion = random(3,behaviorData.passion.length-1);
			let passions = pickRandom(behaviorData.passion,nbPassion);

			if(this.havePerk('crazyworld')){
				let tmp = [];
				for(let i=0;i<passions.length;i++){
					tmp.push(clone(window.database.passionsTransition[passions[i]]));
				}
				passions = tmp;
			}

			this.passions = arrayConcat(this.passions,passions);

			this.sexualpref = pickRandomPond(behaviorData.sexualPrefStart);
			this.startStats = {
				'iq':this.iq,
				'passions':this.passions,
				'sexualpref':this.sexualpref,
			};

			//Generate Testimonial
			this.generateTestimonial();

			this.save();
		}else{
			this.iq = random(90,150);
			this.job = 'unknown';

			this.sexualpref = 'heterosexual';
		}
	}
	giveBirthday(){				//Give a birthday and the Astrological sign
		//Get a Birthday
			let date = new Date();
			let yearOfBirth = date.getUTCFullYear() - this.age;
			let startOfTheYear = new Date(yearOfBirth+'-01-01');
			let pickRandomDate = random(1,364);
			let birthDay = startOfTheYear.getTime() + (pickRandomDate * 24 * 60 * 60 * 1000);
			let birthDayDate = new Date(birthDay);
			this.birthday = giveTimeString(birthDay,'format');

		//Get the Sign
			let allSign = window.database.characterInfo.astrologicalSign;
			for(let sign in allSign){
				let dateIn = new Date(yearOfBirth+'-'+allSign[sign][0]);
				let dateOut = new Date(yearOfBirth+'-'+allSign[sign][1]);
				if(
					(dateIn < dateOut && birthDayDate >= dateIn && birthDayDate <= dateOut)||
					(dateIn > dateOut && (birthDayDate >= dateIn || birthDayDate <= dateOut))
				){
					this.astrologicSign = sign;
					break;
				}
			}
	}
	finishSetUp(){				//Finish to set up the char
		//Define the suposed behavior
		let characters = Object.keys(getStorage('characters'));
		let behaviorsUsed = [];
		for(let charId of characters){
			let char = getCharacter(charId);
			if(char.get('behavior') !== undefined){
				behaviorsUsed.push(char.get('behavior'));
			}
		}
		let behaviorsList = Object.keys(window.database.behaviors);
		behaviorsList.splice(behaviorsList.indexOf('default'),1);
		let unused = arrayDiff(behaviorsList,behaviorsUsed);
		this.behavior = pickRandom(unused);
		this.fillInfo();
		this.saveProfile();
		this.save();
	}
	addPerks(ids){				//Add more perks to the character
		let changeProfile = false;
		let perksInfo = window.database.perks;

		if(this.perks === undefined)
			this.perks = [];

		for(let id of ids){
			if(id[0] == '-'){	//Remove the perk
				id = id.slice(1);
				let ind = this.perks.indexOf(id);
				if(ind !== -1){
					this.perks.splice(ind,1);
				}
			}else if(!this.havePerk(id)){	//Add the perk if not already there
				this.perks.push(id);

				//Change sexual pref if too much vanilla
				if(perksInfo[id].sexualPref !== undefined && ['heterosexual','heterocurious','homosexual'].indexOf(this.sexualpref) !== -1){
					this.sexualpref = perksInfo[id].sexualPref;
					changeProfile = true;
				}

				//Add Stats
				if(perksInfo[id].stats !== undefined){
					for(let statId in perksInfo[id].stats){
						this.add(statId,perksInfo[id].stats[statId]);
					}
				}

				//Add Passions
				if(perksInfo[id].passions !== undefined){
					let passionsTransition = window.database.passionsTransition;
					for(let passionId of perksInfo[id].passions){
						if(passionsTransition[passionId] !== undefined){
							if(this.passions.indexOf(passionId) === -1){
								this.passions.push(passionId);
								changeProfile = true;
							}
						}else{
							if(this.passionsTransformed.indexOf(passionId) === -1){
								this.passionsTransformed.push(passionId);
								changeProfile = true;
							}
						}
					}
				}

				//Size Chest
				if(perksInfo[id].boobs !== undefined){
					let boobsSize = window.database.boobsSize;
					if(perksInfo[id].boobs == '++'){
						//TODO
					}else if(perksInfo[id].boobs == '--'){
						//TODO
					}else if(boobsSize.indexOf(perksInfo[id].boobs) !== -1){
						this.oldBoobsSize = this.sizeBoobs;
						this.sizeBoobs = perksInfo[id].boobs;

						//Pick a set of cloth
						let topSets = getClothes('topCloth',this.sizeBoobs);
						if(this.oldBoobsSize == this.sizeBoobs && topSets.length > 1)
							topSets.splice(topSets.indexOf(this.oldBoobsSet),1);
						this.topCloth = pickRandom(topSets);
					}
				}

				if(perksInfo[id].items !== undefined){
					for(let itemId in perksInfo[id].items){
						let qte = perksInfo[id].items[itemId];
						for(let i=0;i<qte;i++){
							this.addObject(itemId);
						}
					}
				}
			}
			if(id == 'crazyworld'){
				this.bimbo = (100 - this.bimbo);
				this.slut = (100 - this.slut);
				this.bimboStage = window.database.maxStageStats - (this.bimboStage-1);
				this.slutStage = window.database.maxStageStats - (this.slutStage-1);
				if(this.perks.indexOf('oralfixation') === -1){
					this.perks.push('oralfixation');
					if(this.passions === undefined)
						this.passions = [];
					this.passions.push('blowjob');
				}

				this.definePseudo();
			}
		}

		this.giveState('bimbo');
		this.giveState('slut');

		if(changeProfile)
			this.saveProfile();

		this.save();
	}
	havePerk(id){				//Tell if the character have this perk
		if(this.perks === undefined)
			return false;
		return this.perks.indexOf(id) !== -1;
	}
	getHypnoFace(archetype = 'archetype'){
		let typePicts = ( this.havePerk('crazyworld') ? 'seriousPicts' : 'hypnoPicts' );
		return pickRandom(clone(window.database.participants[this.get(archetype)][typePicts]));
	}
	beHypno(type,strength){		//Play the stats change when hypno with the type for the specified strength
		if(this.havePerk('crazyworld'))
			type = 'serious';

		let pts = 0;
		let increase = window.database.difficulty[getStorage('difficulty')].hypno.increase;
		let baseHypno = window.database.difficulty[getStorage('difficulty')].hypno.baseHypno;
		switch(strength){
			case 1:pts=baseHypno*increase[0];break;
			case 2:pts=baseHypno*increase[1];break;
			case 3:pts=baseHypno*increase[2];break;
			case 4:pts=baseHypno*increase[3];break;
		}
		pts = Math.ceil(pts);
		if(['mix','serious'].indexOf(type) !== -1){
			pts *= 0.5;
			this.add('bimbo',pts);
			this.add('slut',pts);
		}else{
			this.add(type,pts);
		}
		if(strength >= 4){
			let hypnoTypes = window.database.hypnoTypes;
			this.add([hypnoTypes[type].crave],1);
		}
	}
	updateMorning(){			//Give a set to use to display the player in the hallway
		let inHallwayData = window.database.participants[this.archetype].inHallway;
		if(inHallwayData !== undefined){
			this.pickHallwaySet = pickRandom(Object.keys(inHallwayData));
			this.save();
		}
	}
	getHappyFace(){				//Give a smiling face
		return window.database.participants[this.archetype].picts.exited;
	}
	getLastFace(){				//Give the last face
		return window.database.participants[this.archetype].picts.out;
	}
	getFace(specific = null){
		if(specific == null){
			return this.pict;
		}else{
			let listPict = window.database.participants[this.archetype].picts;
			if(listPict[specific] !== undefined){
				return listPict[specific];
			}
		}
	}
	changeFace(forceModel = null){			//Being Transformed / Morphed
		let listDispo = archetypeDispo('available');
		if(this.oldArchetype !== undefined)	//Don't have the previous one
			listDispo.splice(listDispo.indexOf(this.oldArchetype),1);

		if(forceModel !== null)
			listDispo.push(forceModel);

		if(listDispo.length > 0){
			let newArchetype = pickRandom(listDispo);
			if(forceModel !== null)
				newArchetype = forceModel;

			if(newArchetype != this.archetype){
				this.oldArchetype = this.archetype;

				this.archetype = newArchetype;
				let infoArchetype = window.database.participants[this.archetype];

				let colorChange = false;
				if(infoArchetype.color !== undefined){
					colorChange = (this.color === undefined);
					this.color = infoArchetype.color;
				}else{
					colorChange = (this.color !== undefined);
					delete this.color;
				}
				this.save();

				//Save the boobs
				if(this.id == 'player'){
					this.oldBoobsSet = this.topCloth;
					if(!this.havePerk('betterbimbobody')){	//Don't change the size with that perks
						this.oldBoobsSize = this.sizeBoobs;
						this.sizeBoobs = infoArchetype.sizeBoobs;

						//If Boobs Bought keep the increase
						if(this.inventory !== undefined && this.inventory.boobsenlargement !== undefined){
							for(let i = 0; i < parseInt(this.inventory.boobsenlargement.stage); i++){
								let indexboobs = window.database.boobsSize.indexOf(this.sizeBoobs);
								this.sizeBoobs = window.database.boobsSize[indexboobs+1];
							}
						}
					}
				}

				//Change Cloth if needed
				if(this.bottomCloth !== undefined && colorChange){
					this.oldClothSet = this.bottomCloth;
					let bottomSets = getClothes('bottomCloth',this.bottomType,false,infoArchetype.color);
					this.bottomCloth = pickRandom(bottomSets);
				}

				//Save the oldface & change to the new one
				this.oldface = this.pict;
				if(this.id == 'player'){
					this.giveFace();
				}else{
					let archetypePicts = window.database.participants[this.archetype].picts;
					this.pict = archetypePicts[this.pictList[ this.stage ]];
				}

				//Other
				this.typeBody = infoArchetype.typeBody;
				this.hairColor = infoArchetype.hairColor;
				this.faceless = pickRandom(window.database.fleshrealmData.facelessPlayer[this.hairColor]);
				this.age = random(infoArchetype.ageRange[0],infoArchetype.ageRange[1]);
				let date = new Date();
				let yearOfBirth = date.getUTCFullYear() - this.age;
				let tmpBirthday = this.birthday.split('/');
				tmpBirthday[2] = yearOfBirth;
				this.birthday = tmpBirthday.join('/');

				//Select the camsPhoto set
				let camsPhotoSets = Object.keys(infoArchetype.camsPhoto);
				this.camsPhotoId = pickRandom(camsPhotoSets);

				//Pick a set of cloth
				if(this.id == 'player'){
					let topSets = getClothes('topCloth',this.sizeBoobs);
					if(this.oldBoobsSize == this.sizeBoobs && topSets.length > 1)
						topSets.splice(topSets.indexOf(this.oldBoobsSet),1);
					this.topCloth = pickRandom(topSets);
				}

				//Change Activities set
				this.activities = this.chooseActivitiesSet();

				this.save();
				
				//Perks
				if(this.id == 'player'){
					let perksModel = clone(window.database.participants[this.oldArchetype].perks);
					if(this.perkLock === undefined || JSON.stringify(perksModel) != JSON.stringify(this.perkLock)){		//Dont delete the lockes Perks
						let perksModelDelete = perksModel.map(function(el) {return '-'+el;})
						this.addPerks(perksModelDelete);
					}
					this.addPerks(infoArchetype.perks);
				}

				if(this.id == 'player'){
					let archeHisto = this.get('stats.archetypeUsed');
					if(archeHisto[newArchetype] === undefined)
						archeHisto[newArchetype] = 0;
					archeHisto[newArchetype]++;
					this.set('stats.archetypeUsed',archeHisto);
					this.set('stats.nbMorph','++');
				}

				//Hallway picts
				this.updateMorning();

				//Regen The Char Details
				this.saveProfile(-1);
			}
		}
	}
	changeCloth(type,action,amount = 1){	//Change a set of cloth or type
		let kindDispo = [];
		let kind = null;
		if(type == 'topCloth'){
			kind = 'sizeBoobs';
			this.oldBoobsSet = this[type];
			if(!this.havePerk('betterbimbobody')){				//Don't change the size
				kindDispo = clone(window.database.boobsSize);
				kindDispo.splice(kindDispo.indexOf('titanic'),1);	//At least now
				this.oldBoobsSize = this[kind];
			}
		}else{
			kindDispo = window.database.bottomType;
			kind = 'bottomType';
			this.oldButtType = this[kind];
			this.oldButtSet = this[type];
		}

		//Reverse the clothing attribution
		if(type == 'bottomCloth' && ['increase','decrease'].indexOf(action) !== -1 && this.havePerk('crazyworld')){
			action = (action == 'increase' ? 'decrease' : 'increase');
		}

		if(kindDispo.length > 0){
			if(action == 'increase'){					//Take the next stage of cloth and choose a set
				let find = kindDispo.indexOf(this[kind]);
				if(kindDispo[find+amount] !== undefined)
					this[kind] = kindDispo[find+amount];
				else
					this[kind] = kindDispo[kindDispo.length-1];
			}else if(action == 'decrease'){				//Take the previous stage of cloth and choose a set
				let find = kindDispo.indexOf(this[kind]);
				if(kindDispo[find-amount] !== undefined)
					this[kind] = kindDispo[find-amount];
				else
					this[kind] = kindDispo[0];
			}else if(action == 'random'){				//Take a random stage of cloth and choose a set
				//Try not to overshot, if no enlargement as been bought
				if(type == 'topCloth'){
					let stageCurrent = (this.inventory.boobsenlargement !== undefined ? this.inventory.boobsenlargement.stage : 0);
					let maxSize = kindDispo.length - 3 + stageCurrent;
					kindDispo = kindDispo.slice(0,maxSize);
				}
				this[kind] = pickRandom(kindDispo);
			}
		}

		let setOfCloth = getClothes(type,this[kind]);

		//Not having the same
		let testHere = setOfCloth.indexOf(this[type]);
		if(testHere !== -1 && setOfCloth.length > 1){
			setOfCloth.splice(testHere,1);
		}

		this[type] = pickRandom(setOfCloth);

		this.save();
	}
	giveValueToAdd(from, type, id, value = null){	//Give the value to be added (from: addvotes or add)
		if(from == 'add'){
			let valOrigin = value;
			let influenceMult = 1;
			let influenceRaw = 0;
			let influenceLog = {};

			//Init if not
			let currentValue = gObj(this,id);
			if(currentValue === undefined){
				sObj(this,id,0);
				currentValue = 0;
			}

			//Perk Influence
				for(let perkId of this.perks){
					let perkInfo = window.database.perks[perkId];
					if(perkInfo.influence !== undefined){
						if(id == 'slut' && perkInfo.influence.slut !== undefined){
							influenceMult += perkInfo.influence.slut;
							influenceLog[perkId] = perkInfo.influence.slut;
						}
						if(id == 'bimbo' && perkInfo.influence.bimbo !== undefined){
							influenceMult += perkInfo.influence.bimbo;
							influenceLog[perkId] = perkInfo.influence.bimbo;
						}
						if(id == 'fans' && perkInfo.influence.fansMult !== undefined){
							influenceMult += perkInfo.influence.fansMult;
							influenceLog[perkId] = perkInfo.influence.fansMult;
						}
						if(id == 'fans' && perkInfo.influence.fans !== undefined){
							influenceRaw += perkInfo.influence.fans;
							influenceLog[perkId] = perkInfo.influence.fans+' raw';
						}
					}
				}

				if(id == 'fans' && type == 'cameraroom' && this.havePerk('camgirl')){
					influenceMult += 0.1;
					influenceLog['camgirl'] = 0.1;
				}

			//Clothes
				if(['bimbo','slut'].indexOf(id) !== -1){
					//Boobs Size 5% per size after small
					let infHere = Math.floor(0.05 * window.database.boobsSize.indexOf(this.sizeBoobs) * 100) / 100;
					influenceMult += infHere;
					influenceLog.boobs = infHere;

					//Bottom 5% per size after basic
					infHere = Math.floor(0.05 * window.database.bottomType.indexOf(this.bottomType) * 100) / 100;
					influenceMult += infHere;
					influenceLog.bottom = infHere;
				}

			//Stage Influence 20% per stage
				if(window.database.stageType.indexOf(id) != -1){
					let infHere = ((parseInt(this[id+'Stage'])-1)/20);
					influenceMult += infHere;
					influenceLog.stage = infHere;
				}

			influenceMult = Math.round(influenceMult * 100) / 100;
			value = (value * influenceMult) + influenceRaw;

			if(['fans'].indexOf(id) !== -1)
				value = Math.ceil(value);

			//Crazy World
			if(['bimbo','slut'].indexOf(id) !== -1 && this.havePerk('crazyworld')){
				value *= -1;
			}
			//Happy (doctor_visit)
			if(['bimbo','slut'].indexOf(id) !== -1 && this.havePerk('happy')){
				value = 0;
			}

			console.log('type:'+id,'val origin:'+valOrigin,'val final:'+value,'influenceMult:'+influenceMult,'influenceRaw:'+influenceRaw,'influenceLog:',influenceLog);

			return {'numberCalc':value,'currentValue':currentValue};
		}else if(from == 'addvotes'){
			if(id === undefined)id = type;

			let newVote = 0;
			let mult = 1;
			if(type == 'cameraroom'){
				newVote = window.database.difficulty[getStorage('difficulty')].votePerCamera;
				if(this.havePerk('hairperfectionist'))
					mult += 0.1;
				if(this.havePerk('camgirl'))
					mult += 0.1;

			}else if(type == 'discuss'){
				newVote = window.database.difficulty[getStorage('difficulty')].votePerDiscuss;
				if(this.havePerk('makeupmaster')){
					let makeup = this.doHave('makeup');
					if(makeup !== false){
						mult += (makeup.stage * 0.1);
					}
				}
			}else if(type == 'action'){
				newVote = window.database.difficulty[getStorage('difficulty')].votePerAction;
				if(this.havePerk('voluptuous'))
					mult += 1.25;
				if(this.havePerk('model'))
					mult += 1.5;
			}else if(type == 'funtime'){
				newVote = window.database.difficulty[getStorage('difficulty')].votePerFuntime;
				let sextoys = this.doHave('sextoys');
				if(sextoys !== false){
					mult += (sextoys.stage-1);
				}
			}else if(type == 'bonusStage'){
				let participants = getHousemateId('all');
				for(let participantId of participants){
					let participant = getCharacter(participantId);
					newVote += participant.get('stage') * window.database.difficulty[getStorage('difficulty')].votePerStageBonus;
				}
			}else if(value !== null){
				newVote = value;
			}

			newVote = newVote * mult;

			//Malus on repetitive activities
			let occuActivity = 0;
			if(['funtime','cameraroom','bonusStage'].indexOf(type) === -1){
				let key = type+'-'+id;
				if(this.histoActivities === undefined)
					this.histoActivities = [];
				let nbHisto = window.database.difficulty[getStorage('difficulty')].histoActivities;
				let occArr = arrayOccurence(this.histoActivities);
				if(occArr[key] !== undefined){
					newVote -= Math.min(newVote,occArr[key]*0.33 * newVote);
					occuActivity = occArr[key];
				}
				if(this.histoActivities.length == nbHisto)
					this.histoActivities.shift();
				this.histoActivities.push(key);
			}

			let influence = 1;

			//State
			influence += this.giveSlut()/2 * 0.005;
			influence += this.bimbo/2 * 0.001;

			//Boobs Size 5% per size after small
			influence += Math.floor(0.05 * window.database.boobsSize.indexOf(this.sizeBoobs) * 100) / 100;

			//Bottom 5% per size after basic
			influence += Math.floor(0.05 * window.database.bottomType.indexOf(this.bottomType) * 100) / 100;

			//Perks
			for(let perkId of this.get('perks')){
				let perkInfo = window.database.perks[perkId];
				if(perkInfo.votesMult !== undefined)
					influence *= perkInfo.votesMult;
				if(perkInfo.votes !== undefined)
					influence += perkInfo.votes;
			}

			let newVoteInfluenced = 0;
			if(['fans-replace','fans-service'].indexOf(type) !== -1)	//Not influenced
				newVoteInfluenced = Math.floor(newVote);
			else
				newVoteInfluenced = Math.floor(newVote * influence);

			console.log("vote: "+newVote,'influence: '+(Math.round(influence * 100)/100),'influenced: '+newVoteInfluenced);

			return {'numberCalc':newVoteInfluenced,'occuActivity':occuActivity};
		}
	}
	addvotes(type,id,value = null){			//Give the votes for the character according to the type

		let info = this.giveValueToAdd('addvotes',type,id,value);
		let newVoteInfluenced = info.numberCalc;
		let occuActivity = info.occuActivity;
		this.stats.totalVoteGain += Math.round(newVoteInfluenced);
		this.votes += Math.round(newVoteInfluenced);
		this.save();

		return {'nbVote':newVoteInfluenced,'occuActivity':occuActivity};
	}
	doAction(activityId){					//Manage when doing action
		if(this.havePerk('ditz') && random(0,100) <= 25){			//Add Ditz points
			this.set('ditzNumber','++');
			manageDitzScreen();
		}
	}
	add(id,val,type = null){				//Add modify stats

		if(type === null)type = id;

		//If the fan feature is disabled give votes instead
		if(id == 'fans' && !setting('fanfeature')){
			let infoPts =  this.addvotes('fans-replace','fans-replace',parseInt(val) * 5);
			popupVotes(infoPts);
			return true;
		}

		let info = this.giveValueToAdd('add',type,id,val);
		let valToAdd = info.numberCalc;
		let currentValue = info.currentValue;
		let newVal = (Math.round((currentValue + valToAdd)*100)/100);

		//Stats
		if(['bimbo','slut','fans'].indexOf(id) !== -1){
			if(this.stats['total'+ucfirst(id)+'Gain'] === undefined)
				this.stats['total'+ucfirst(id)+'Gain'] = 0;
			this.stats['total'+ucfirst(id)+'Gain'] += valToAdd;
		}else if(id.indexOf('stats.') === 0){
			let tmp = clone(id).replace('stats.','');
			if(this.stats['total'+ucfirst(id)+'Gain'] === undefined)
				this.stats[tmp] = 0;
			this.stats[tmp] += valToAdd;
		}

		if(['bimbo','slut'].indexOf(id) !== -1 && newVal > 100){
			newVal = 100;
		}else if(['bimbo','slut','votes','fans'].indexOf(id) !== -1 && newVal < 0){
			newVal = 0;
		}

		//With that perk the min is 33%
		if(this.havePerk('betterbimbobody') && ['bimbo','slut'].indexOf(id) !== -1 && newVal < 33)
			newVal = 33;

		this.set(id,newVal);
		return valToAdd;
	}
	set(id,val){
		if(id.indexOf('.') !== -1){
			let objVal = gObj(this,id);
			if(['++','--'].indexOf(val) !== -1 && objVal === undefined)
				objVal = 0;
			if(val == '++')
				val = objVal+1;
			else if(val == '--')
				val = objVal-1;
			sObj(this,id,val);
		}else{
			if(['++','--'].indexOf(val) !== -1 && this[id] === undefined)
				this[id] = 0;
			if(val == '++')
				val = this[id]+1;
			else if(val == '--')
				val = this[id]-1;
			this[id] = val;
		}
		if(['bimbo','slut'].indexOf(id) !== -1){
			this.giveState('slut');
			this.giveState('bimbo');
			this.definePseudo();
			this.giveFace();
		}
		this.save();
	}
	get(varId){

		if(varId == 'slutState'){
			if(this.havePerk('exhibitionist')||this.havePerk('naturist')){
				let slutRanges = Object.keys(window.database.slutRanges);
				return slutRanges[slutRanges.length-1];
			}
		}

		return gObj(this,varId);
	}
	save(){
		setCharacter(this.id,JSON.stringify(this));
	}
}

class dream{

	blockToPlay = [];
	blockPlayed = [];
	continueList = [];

	constructor(params){
		let gameState = getStorage('gameState');
		if(gameState.info.dream === undefined){		//When nothing is choosed
			this.pickADream();
			if(this.dreamKept !== null){
				this.dreamInfo = clone(window.database.morning.dreams[this.dreamKept]);

				//Pick the start, the first one to match
				let blockChoosed = null;
				if(this.dreamInfo.start !== undefined){
					for(let blockId of this.dreamInfo.start){
						let blockInfo = this.dreamInfo.parts[blockId];
						if(blockInfo.conditions !== undefined && !checkCond(blockInfo.conditions))
							continue;
						blockChoosed = blockId;
						break;
					}
				}

				this.getBlockToPlay(blockChoosed);
				this.pickPictures();
				this.refreshGameState();
			}
		}else{
			let infos = gameState.info.dream;
			for(let elemId in infos){
				this[elemId] = infos[elemId];
			}
			if(this.dreamKept !== null){
				this.dreamInfo = clone(window.database.morning.dreams[this.dreamKept]);
			}
		}
	}

	getData(gameData){						//Give the data to store in the gameState
		gameData.info.dream = {
			'dreamKept':this.dreamKept ?? null,
			'blockPlayed':this.blockPlayed ?? [],
			'blockToPlay':this.blockToPlay ?? [],
			'continueList':this.continueList ?? []
		};
		if(this.funType !== undefined)
			gameData.info.funType = this.funType;
		if(this.gameWinPts !== undefined)
			gameData.info.dream.gameWinPts = this.gameWinPts;
		if(this.gameLosePts !== undefined)
			gameData.info.dream.gameLosePts = this.gameLosePts;
		if(this.changeCloth !== undefined)
			gameData.info.changeCloth = this.changeCloth;
		if(this.continueList !== undefined)
			gameData.info.dream.continueList = this.continueList;
		return gameData;
	}
	getAvailable(){					//Get the list of playable dreams
		let player = getCharacter('player');
		let nextDream = getStorage('nextDream');
		let villa = getStorage('villa');
		let dreamsUsed = Object.keys(player.get('stats.dreams'));
		if(dreamsUsed === false)
			dreamsUsed = [];
		let dreamsDisabled = setting('dreamsDisabled');
		if(dreamsDisabled === undefined)
			dreamsDisabled = [];

		let allDreams = clone(window.database.morning.dreams);
		let availableDreamsTest = [];
		let availableDreamsRepeat = [];

		for(let dreamId in allDreams){
			let dreamInfo = allDreams[dreamId];
			if(dreamsDisabled.indexOf(dreamId) !== -1)	//Disable from the options
				continue;
			if(dreamInfo.conditions !== undefined && !checkCond(dreamInfo.conditions))
				continue;
			if(dreamsUsed.indexOf(dreamId) !== -1){		//Already dreamed of
				if(dreamInfo.repeatable === undefined||dreamInfo.repeatable === false){		//If repeatable
					availableDreamsRepeat.push(dreamId);
				}
			}else{
				availableDreamsTest.push(dreamId);
			}
		}

		//Take those not already played or the repeatable ones
		this.availableDreams = (availableDreamsTest.length > 0 ? availableDreamsTest : availableDreamsRepeat);

		if(nextDream !== undefined && nextDream !== false)
			this.availableDreams.push(nextDream);
	}
	pickPictures(){					//Select the pictures to display & keep
		let player = getCharacter('player');
		let dreamed = clone(player.get('stats.dreams'));

		//Find the Picture to Keep
		let fistPart = this.dreamInfo.parts[this.blockToPlay[0]];
		let nbPict = 0;
		for(let elem of clone(fistPart.content)){
			if(elem.media !== undefined){
				nbPict++;
				if(this.dreamInfo.pictToSave !== undefined && this.dreamInfo.pictToSave != nbPict)
					continue;

				let randomPict = '';
				if(elem.setName !== undefined){
					randomPict = getSetMedia(elem.setName,elem.media);
				}else{
					randomPict = pickRandom(elem.media);
				}
				if(dreamed[this.dreamKept] == undefined){
					dreamed[this.dreamKept] = randomPict;
					break;
				}
			}
		}
		player.set('stats.dreams',dreamed);
	}
	doEffects(effects){					//Play the effect
		if(effects !== undefined){
			let player = getCharacter('player');
			for(let effectId in effects){
				let effect = effects[effectId];
				if(effectId == 'perks' && effect.length > 0){
					player.addPerks(effects.perks);
				}else if(effectId == 'doMastu' && effect){
					if(effect == 'available'){
						if(player.inventory.sextoys !== undefined)
							effect = 'dildo';
						else
							effect = 'manual';
					}
					this.funType = effect;
				}else if(['bottomCloth','topCloth'].indexOf(effectId) !== -1 && effect){
					player.changeCloth(effectId,effect);
					this.changeCloth = effectId;
				}else if(effectId == 'time'){										//Advance in the day
					let dayTime = Object.keys(getDayTimeList('all'));
					this.changeTime = dayTime[parseInt(effects.time)-1];
				}else if(effectId == 'gameLosePts'){
					if(this.gameLosePts === undefined)
						this.gameLosePts = 0;
					if(effect == '++')
						this.gameLosePts += 1;
				}else if(effectId == 'gameWinPts'){
					if(this.gameWinPts === undefined)
						this.gameWinPts = 0;
					if(effect == '++')
						this.gameWinPts += 1;
				}else if(effectId == 'variable'){
					for(let elemId in effect){
						let tmp = elemId.split('.');
						let variableName = tmp[0];
						let variableObj = getStorage(variableName);
						tmp = tmp.slice(1).join('.');
						sObj(variableObj,tmp,effect[elemId]);
						setStorage(variableName,variableObj);
					}
				}else{
					player.add(effectId,effect);
				}
			}
			this.refreshGameState();
		}
	}
	pickADream(){					//Give the dream to play
		this.dreamKept = null;
		let nextDream = getStorage('nextDream');
		let dreamProbaBase = window.database.morning.dreamProbaBase;
		let dreamProbaIncrease = window.database.morning.dreamProbaIncrease;

		//From Option if setup
		let dreamsProba = setting('dreamsProba');
		if(dreamsProba !== undefined)
			dreamProbaBase = dreamsProba.slice(0,-1);
		let dreamsProbaIncrease = setting('dreamsProbaIncrease');
		if(dreamsProbaIncrease !== undefined)
			dreamProbaIncrease = dreamsProbaIncrease.slice(0,-1);

		let probaDream = getStorage('probaDream');
		if(probaDream === false)
			probaDream = dreamProbaBase;

		//If 0% => desactivated no dream
		if(dreamProbaBase <= 0)
			probaDream = 0;

		this.getAvailable();
		if(this.availableDreams.length > 0){

			let randomPick = random(0,100);

			if(nextDream !== undefined && nextDream !== false)
				randomPick = 0;

			if(randomPick < probaDream){
				this.dreamKept = pickRandom(this.availableDreams);

				if(nextDream !== undefined && nextDream !== false){
					this.dreamKept = nextDream;
					deleteStorage('nextDream');
				}

				setStorage('probaDream',dreamProbaBase);
			}else{
				setStorage('probaDream',probaDream + dreamProbaIncrease);
			}
		}
		if(typeof forceDream !== 'undefined')
			this.dreamKept = forceDream;
	}
	getBlockToPlay(blockChoosed){	//Give what block to play and the continue list
		let gameState = getStorage('gameState');

		//Check if continue and choice or direct
		this.blockToPlay = [blockChoosed];
		this.blockPlayed.push(blockChoosed);
		this.doEffects(this.dreamInfo.parts[blockChoosed].effects ?? null);
		let continueAvailable = getContinue(this.blockPlayed,this.dreamInfo,blockChoosed);
		while(Object.keys(continueAvailable).length == 1){
			let blockNow = Object.keys(continueAvailable)[0];
			let forceBtn = (this.dreamInfo.parts[blockNow].forceBtn !== undefined && this.dreamInfo.parts[blockNow].forceBtn);
			if(forceBtn)break;
			this.blockToPlay.push(blockNow);
			this.blockPlayed.push(blockNow);
			this.doEffects(this.dreamInfo.parts[blockNow].effects ?? null);
			continueAvailable = getContinue(this.blockPlayed,this.dreamInfo,blockNow);
		}
		if(Object.keys(continueAvailable).length > 0){
			this.continueList = Object.keys(continueAvailable);
		}else{
			this.continueList = [];
		}

	}
	selectPath(newBlockId){				//Choose a part to display
		this.getBlockToPlay(newBlockId);
		this.refreshGameState();
		this.display();
		window.scrollTo(0, 0);
	}
	refreshGameState(){
		let gameState = getStorage('gameState');
		gameState = this.getData(gameState);
		setStorage('gameState',gameState);
	}

	gameWin(){
		if(this.gameWinPts === undefined)
			this.gameWinPts = 0;
		this.gameWinPts++;
		this.refreshGameState();

		//Show the continue buttons
		let btnsToHide = getId('dailyDream').querySelectorAll('.dreamBtn');
		for(let btnToHide of btnsToHide){
			removeClass(btnToHide,'hide');
		}
	}
	gameLose(){
		if(this.gameLosePts === undefined)
			this.gameLosePts = 0;
		this.gameLosePts++;
		this.refreshGameState();

		//Show the continue buttons
		let btnsToHide = getId('dailyDream').querySelectorAll('.dreamBtn');
		for(let btnToHide of btnsToHide){
			removeClass(btnToHide,'hide');
		}
	}

	display(){						//Display the content
		let gameState = getStorage('gameState');
		let player = getCharacter('player');
		let characterSec = getStorage('characterSec');

		if(typeof forceDream !== 'undefined')
			this.dreamKept = forceDream;
		if(this.dreamKept !== undefined && this.dreamKept !== null){

			let contentDisplay = [];
			let contentTmp = [];

			//Surdef First Content
			let firstPictCheck = false;
			let firstTextCheck = false;
			let nbPict = 1;
			let gameSettings = [];
			for(let blockId of this.blockToPlay){
				let partHere = this.dreamInfo.parts[blockId];
				let content = partHere.content;

				if(contentTmp.length > 0)
					contentTmp = arrayConcat(contentTmp,['CONTINUE']);

				for(let elemId in content){
					let elem = content[elemId];

					if(elem.media !== undefined){
						if(!firstPictCheck && this.blockPlayed[0] == blockId && (this.dreamInfo.pictToSave === undefined||this.dreamInfo.pictToSave == nbPict)){	//Take the picture already choose
							content[elemId].media = player.get('stats.dreams.'+this.dreamKept);
							firstPictCheck = true;
						}
						nbPict++;
					}
					if(elem.text !== undefined && !firstTextCheck && this.blockPlayed[0] == blockId){	//Add the first line
						if(partHere.firstline !== undefined)
							content[elemId].text = getTrad(partHere.firstline,{'player':player})+' '+getTrad(elem.text,{'player':player});
						else
							content[elemId].text = getTrad('morning.dreams.start')+' '+getTrad(elem.text,{'player':player});
						firstTextCheck = true;
					}
					
					//Surdef elements
					if(typeof elem == 'string' && elem.indexOf('FLESHGODDESSPICT') !== -1){
						let pictNumber = elem.replace('FLESHGODDESSPICT','');
						let pict = pickRandom(clone(window.database.characterSec.fleshgoddess.set[characterSec.fleshgoddess.set].picts['pict'+pictNumber]));
						content[elemId] = {"who":null,"media":pict};

						let dreamed = clone(player.get('stats.dreams'));
						dreamed[this.dreamKept] = pict;
						player.set('stats.dreams',dreamed);
					}else if(typeof elem == 'string' && elem.indexOf('NATUREGODDESSPICT') !== -1){
						let pictNumber = elem.replace('NATUREGODDESSPICT','');
						let pict = pickRandom(clone(window.database.characterSec.naturegoddess.set[characterSec.naturegoddess.set].picts['pict'+pictNumber]));
						content[elemId] = {"who":null,"media":pict};

						let dreamed = clone(player.get('stats.dreams'));
						dreamed[this.dreamKept] = pict;
						player.set('stats.dreams',dreamed);
					}

					if(elem.game !== undefined){
						gameSettings.push(elem.game);
					}

					contentTmp.push(content[elemId]);
				}
			}

			//If change cloth
			if(gameState.info.changeCloth !== undefined){
				let tmpHtml = [];
				tmpHtml.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('morning.changeCloth.'+gameState.info.changeCloth,player)));
				tmpHtml.push('<div class="centerContent">'+imgVideo(player.picturesTypes(gameState.info.changeCloth)[0])+'</div>');
				if(getId('dreamChangeCloth') !== null)
					getId('dreamChangeCloth').innerHTML = tmpHtml.join('');
			}

			//Get the content to Display
			let paramsContent = {'player':player,'specType':'dream'};
			contentDisplay = giveDisplay(contentTmp,paramsContent);

			//Get the button
			let haveBtn = false;
			if(this.continueList !== undefined && this.continueList.length > 0){
				if(this.continueList.length >= 4){
					contentDisplay.push('<div class="groupBtn">');
				}
				for(let partNext of this.continueList){
					let infoPart = clone(this.dreamInfo.parts[partNext]);
					let addAttribute = ['data-id="'+partNext+'"'];
					if(infoPart.donthide !== undefined && infoPart.donthide)
						addAttribute.push('data-nohide="1"');
					contentDisplay.push('<div class="dreamBtn useBtn" '+addAttribute.join(' ')+'><img src="'+infoPart.icon+'"><span>'+getTrad(infoPart.title)+'</span></div>');
					haveBtn = true;
				}
				if(this.continueList.length >= 4){
					contentDisplay.push('</div>');
				}
			}
			if(contentTmp.indexOf('CONTINUE') !== -1)
				haveBtn = true;

			getId('dailyDream').querySelector('content').innerHTML = '<div id="eventContinue0">'+contentDisplay.join('')+'</div>';

			//Enable the game
			if(gameSettings.length > 0){
				for(let gameSetting of gameSettings){
					let paramsGame = gameSetting.params;
					if(gameSetting.config !== undefined){
						let diffConfig = gameSetting.config[getStorage('difficulty')];
						for(let elemId in diffConfig){
							paramsGame[elemId] = diffConfig[elemId];
						}
					}
					switch(gameSetting.type){
						case 'game1':
							new game1(paramsGame);
							break;
					}
				}

				//Hide the continue buttons
				let btnsToHide = getId('dailyDream').querySelectorAll('.dreamBtn');
				for(let btnToHide of btnsToHide){
					if(btnToHide.getAttribute('data-nohide') !== null && btnToHide.getAttribute('data-nohide') == 1)
						continue;
					addClass(btnToHide,'hide');
				}
			}

			if(!haveBtn){
				removeClass(getId('dailyDreamBtn'),'hide');
			}else{
				addClass(getId('dailyDreamBtn'),'hide');
			}

			//Control on the button
			let dreamBtns = getId('dailyDream').querySelectorAll('div.dreamBtn');
			for(let dreamBtn of dreamBtns){
				dreamBtn.onclick = function(){
					let dreamObj = getId('dailyDream').dream;
					let newPath = this.getAttribute('data-id');
					dreamObj.selectPath(newPath);
				}
			}
			activateController();

			if(haveClass(getId('dailyDitz'),'hide'))
				removeClass(getId('dailyDream'),'hide');
			else
				getId('dailyDitz').querySelector('.btnChange').setAttribute('data-target','dailyDream');

		}else{
			addClass(getId('dailyDream'),'hide');
		}
	}
}

/******************************/
/********* HELPER *************/
/******************************/

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
//Create observer for changes on a element and execute the method
function setObserver(elementId,type,methodToCall){

	let element = getId(elementId);
	let config = {};
	if(type == 'class'){
		if(config.attributeFilter == undefined)
			config.attributeFilter = [];
		config.attributeFilter.push('class');
	}

	if(observers[elementId] !== undefined){
		observers[elementId].observe(element,config);
		return true;
	}

	// Callback function to execute when mutations are observed
	const callback = (mutationList, observer) => {
		window[methodToCall]();
	};

	// Create an observer instance linked to the callback function
	const observer = new MutationObserver(callback);

	// Start observing the target node for configured mutations
	observer.observe(element, config);
	observers[elementId] = observer;

	// Later, you can stop observing
	//observer.disconnect();
}
//Give the position of a class
function findClass(element,className){
	let classes = element.className;
	if(classes === undefined)
		return -1;
	classes = classes.split(' ');
	return classes.indexOf(className);
}
function haveClass(element,className){return (findClass(element,className) != -1);}
//Add a class to the element
function addClass(element,classNames,position){
	if(element !== null){
		if(!Array.isArray(classNames))
			classNames = [classNames];
		for(let className of classNames){
			if(position === undefined)
				position = findClass(element,className);
			if(position == -1)
				element.classList.add(className);
		}
	}
}
//Remove class to the element
function removeClass(element,className,position){
	if(element !== null){
		if(className instanceof Array){
			for(let id of className){
				removeClass(element,id,position)
			}
		}else{
			if(position === undefined)
				position = findClass(element,className);
			if(position != -1){
				element.classList.remove(className);
			}
		}
	}
}
function emptyClass(element,list){
	if(list === undefined)
		element.className = '';
	else{
		for(let id of list){
			removeClass(element,id);
		}
	}
}
//Toggle a class to the element
function toggleClass(element,className){
	let position = findClass(element,className);
	if(position == -1)
		addClass(element,className,position);
	else
		removeClass(element,className,position);
}
function getId(id,from){
	if(from !== undefined)
		return getId(from).getElementById(id);
	else
		return document.getElementById(id);
}
function showError(error){
	let trace = error.stack.split("\n");
	let traceClear = [];
	for(let line of trace){
		let tmp = line.split('/');
		traceClear.push(tmp[0]+'...'+tmp[tmp.length-1]);
	}
	traceClear = traceClear.join('<br>');
	let version = (window.database.version !== undefined ? '[Version: '+window.database.version+']<br>' : '');
	getId('errorContent').innerHTML = version+error.name + "<br><b>" + error.message + "</b><br>" + traceClear;

	let gameState = getStorage('gameState');
	if(gameState !== undefined && gameState !== false){
		getId('errorContent').innerHTML += '<br><u>GameState</u>:'+JSON.stringify(gameState);
	}

	removeClass(getId('popupError'),'hide');
	addClass(getId('popupError'),'show');
	getId('closeError').onclick = function(){
		getId('errorContent').innerHTML = '';
		addClass(getId('popupError'),'hide');
		removeClass(getId('popupError'),'show');
	};
}
//Memory Usage
function getLocalStorageIntake(){
	let info = [];
	let _lsTotal=0,_xLen,_x;for(_x in localStorage){ if(!localStorage.hasOwnProperty(_x)){continue;} _xLen= ((localStorage[_x].length + _x.length)* 2);_lsTotal+=_xLen; info.push(_x.substr(0,50)+" = "+ (_xLen/1024).toFixed(2)+" KB")};info.push("Total = " + (_lsTotal / 1024).toFixed(2) + " KB");
	return info;
}
//Have the info for the saves
function getSaveInfo(){
	let elemsSaved = {};
	for(let elem of elemsToSave){
		elemsSaved[elem] = getStorage(elem);
	}
	return JSON.stringify(elemsSaved);
}
//Save the Game
function saveTheGame(nameSave,textSave){
	let regexId = /[^a-zA-Z0-9_-]/;
	let nameId = nameSave.replace(regexId,'');

	let infoSave = getSaveInfo();

	let saves = getStorage('saves');
	if(saves == false)
		saves = {};

	let gameState = getStorage('gameState');
	let nameTime = (gameState.time == 'nextDay' ? ucfirst(getTrad('basic.time.night')) : ucfirst(getTrad('basic.time.'+gameState.time)));
	let dateNow = ucfirst(getTrad('basic.day'))+': '+gameState.dayNumber+' / '+nameTime;

	let player = getCharacter('player');
	let newSave = {'name':textSave,'date':dateNow,'player':player.firstname+' '+player.lastname,'content':infoSave};
	if(player.mod !== undefined && player.mod.hardcore)
		newSave.isHardcore = true;
	saves[nameId] = newSave;
	setStorage('saves',saves);
}
//Apply the effects
function doEffects(effects, charId = 'player'){
	let character = getCharacter(charId);
	let gameState = getStorage('gameState');

	//Play the effects
	if(effects !== undefined && effects.length > 0){
		for(let effect of effects){
			for(let effectId in effect){
				if(effectId == 'perks' && effect[effectId].length > 0){
					character.addPerks(effect[effectId]);
				}else if(effectId == 'perksTimer' && effect[effectId].ids !== undefined && effect[effectId].ids.length > 0){
					character.addPerks(effect[effectId].ids);
					if(character.perksTimer === undefined)
						character.perksTimer = [];
					character.perksTimer.push({'ids':effect[effectId].ids,'date':gameState.dayNumber + effect[effectId].time});
					character.save();
				}else if(effectId == 'achievements' && effect[effectId].length > 0){
					let achievementsUnlocked = getStorage('achievements');
					let dateNow = new Date();
					for(let aInfo of effect[effectId]){
						if(achievementsUnlocked[aInfo.id] === undefined){
							achievementsUnlocked[aInfo.id] = dateNow.getFullYear()+'-'+('0' + (dateNow.getMonth()+1)).slice(-2)+'-'+dateNow.getDate()+' '+('0' + dateNow.getHours()).slice(-2)+':'+('0' + dateNow.getMinutes()).slice(-2);
							showAchievement(aInfo.id,aInfo.type,getId('achievementsLoc'));
						}
					}
					setStorage('achievements',achievementsUnlocked);
				}else if(['bottomCloth','topCloth'].indexOf(effectId) !== -1 && effect[effectId]){
					character.changeCloth(effectId,effect[effectId]);
				}else if(effectId == 'changeFace' && effect[effectId] === true){
					character.changeFace();
				}else if(effectId == 'itemDelete'){
					let itemId = effect[effectId];
					if(character.inventory[itemId] !== undefined){
						let inventory = character.get('inventory');
						delete inventory[itemId];
						character.set('inventory',inventory);
					}
				}else if(effectId == 'itemAdd'){
					let itemId = effect[effectId];
					if(character.inventory[itemId] !== undefined){
						if(character.inventory[itemId].quantity !== undefined)
							character.set('inventory.'+itemId+'.quantity','++');
					}else{
						let infoItem = window.database.buyable[itemId];
						let inventory = character.get('inventory');
						inventory[itemId] = infoItem;
						character.set('inventory',inventory);
					}
				}else if(effectId == 'nexthousemate'){
					if(effect[effectId] == 'init'){
						let allChar = arrayShuffle(getHousemateId());
						character.info.nexthousemate = allChar;
						delete character.info.nexthousemateCurrent;
						character.save();
					}else if(effect[effectId] == 'pick'){
						let newHousemate = character.info.nexthousemate.shift();
						character.info.nexthousemateCurrent = newHousemate;
						character.save();
					}
				}else if(effectId == 'nexthousemateCurrent'){
					let player = getCharacter('player');
					let housemate = getCharacter(player.info.nexthousemateCurrent);
					if(effect[effectId] == 'addStage'){
						housemate.addStage();
					}else if(effect[effectId] == 'changeFace'){
						housemate.changeFace();
					}
				}else if(effectId == 'set'){
					for(let elemId in effect[effectId]){
						sObj(character,elemId,effect[effectId][elemId]);
					}
					character.save();
				}else if(effectId == 'variable'){
					let rule = effect[effectId];
					let tmp = rule.target.split('.');
					let variableName = tmp[0];
					let variableObj = getStorage(variableName);
					tmp = tmp.slice(1).join('.');
					let currentValue = gObj(variableObj,tmp);

					let newValue = null;
					if(rule.value !== undefined)
						newValue = rule.value;
					else if(rule.add !== undefined)
						newValue = currentValue + rule.add;
					if(tmp.indexOf('.appreciation') !== -1)		//Avoid more than 100 and less than 0
						newValue = Math.min(100,Math.max(0,newValue));
					sObj(variableObj,tmp,newValue);

					setStorage(variableName,variableObj);
				}else{
					let result = character.add(effectId,effect[effectId]);
					if(effectId == 'fans'){
						popupVotes({'nbFans':result});
					}else if(effectId == 'votes'){
						popupVotes({'nbVote':result});
					}
				}
			}
		}
	}
}
// Tell if the conditions are respected or not
function checkCond(conditions,charId = null,rules = 'and'){
	if(conditions === undefined||(conditions instanceof Array && conditions.length == 0))
		return true;

	if(conditions.and !== undefined){
		return checkCond(conditions.and,charId,'and');
	}else if(conditions.or !== undefined){
		return checkCond(conditions.or,charId,'or');
	}else if(!(conditions instanceof Array) && typeof conditions === 'object'){
		return checkCondPart(conditions,charId);
	}else{
		let ok = [];
		for(let i=0;i<conditions.length;i++){
			let res = null;

			if(conditions[i].or !== undefined||conditions[i].and !== undefined)
				res = checkCond(conditions[i],charId);
			else
				res = checkCondPart(conditions[i],charId);

			if(!res && rules == 'and')
				return false;
			else if(res && rules == 'or')
				return true;
			ok.push(res);
		}
		return ok.indexOf(true) !== -1;
	}
}
//Do the check Conditions
function checkCondPart(condition, charId){
	let gameState = getStorage('gameState');

	if(charId === undefined || charId === null)
		charId = 'player';
	if(condition.who !== undefined)
		charId = condition.who;

	let character = getCharacter(charId);

	//Events
		if(condition.hadEventAll !== undefined){			//Have all the events in the list
			let interEvent = arrayInter(condition.hadEventAll,Object.keys(character.stats.eventOtherEncountered));
			return (interEvent.length == condition.hadEventAll.length);
		}else if(condition.hadEventOne !== undefined){		//Have at least one the events in the list
			let interEvent = arrayInter(condition.hadEventOne,Object.keys(character.stats.eventOtherEncountered));
			return (interEvent.length > 0);
		}else if(condition.notHadEventOne !== undefined){	//Don't Have any of the events in the list
			let interEvent = arrayInter(condition.notHadEventOne,Object.keys(character.stats.eventOtherEncountered));
			return (interEvent.length == 0);
		}
		if(condition.uniqueEvent !== undefined && character.stats.eventOtherEncountered[condition.uniqueEvent] !== undefined)
			return false;
	//Dreams
		if(condition.hadDreamAll !== undefined){			//Have all the events in the list
			let interEvent = arrayInter(condition.hadDreamAll,Object.keys(character.stats.dreams));
			return (interEvent.length == condition.hadDreamAll.length);
		}else if(condition.hadDreamOne !== undefined){		//Have at least one the events in the list
			let interEvent = arrayInter(condition.hadDreamOne,Object.keys(character.stats.dreams));
			return (interEvent.length > 0);
		}else if(condition.notHadDreamOne !== undefined){	//Don't Have any of the events in the list
			let interEvent = arrayInter(condition.notHadDreamOne,Object.keys(character.stats.dreams));
			return (interEvent.length == 0);
		}
	//Perks
		if(condition.havePerks !== undefined){		//Have all the perks in the list
			let interEvent = arrayInter(condition.havePerks,character.perks);
			return (interEvent.length == condition.havePerks.length);
		}else if(condition.havePerksOne !== undefined){		//Have at least one of the perks in the list
			let interEvent = arrayInter(condition.havePerksOne,character.perks);
			return (interEvent.length > 0);
		}else if(condition.notHavePerks !== undefined){		//Don't Have any of the perks in the list
			let interEvent = arrayInter(condition.notHavePerks,character.perks);
			return (interEvent.length == 0);
		}
	//Cheats
		if(condition.haveCheatsCurrent !== undefined && condition.haveCheatsCurrent){
			if(character.stats.cheatsCurrent === undefined || Object.keys(character.stats.cheatsCurrent).length == 0)
				return false;

			let haveCheat = false;
			for(let cheatId in character.stats.cheatsCurrent){
				if(character.stats.cheatsCurrent[cheatId] > 0){
					return true;
				}
			}

			return false;
		}
	//Other
		if(condition.wasMan !== undefined){
			if(character.wasMan === undefined)
				character.wasMan = false;
			return (condition.wasMan == character.wasMan);
		}
		if(condition.version !== undefined){
			let villa = getStorage('villa');
			return (villa.version !== undefined && villa.version >= condition.version);
		}
		if(condition.items !== undefined){
			for(let itemId in condition.items){
				let haveIt = character.doHave(itemId);
				if(!haveIt || (haveIt.stage !== undefined && condition.items[itemId].indexOf(haveIt.stage) === -1) || (haveIt.quantity !== undefined && haveIt.quantity < condition.items[itemId])){
					return false;
				}
			}
			return true;
		}
		if(condition.noItems !== undefined){
			for(let itemId in condition.noItems){
				let haveIt = character.doHave(itemId);
				if(haveIt && (haveIt.quantity === undefined || haveIt.quantity > 0)){
					return false;
				}
			}
			return true;
		}
		if(condition.actions !== undefined){
			return (gameState.info !== undefined && gameState.info.action !== undefined && condition.actions.indexOf(gameState.info.action) !== -1);
		}
		if(condition.notActions !== undefined){
			return (gameState.info !== undefined && gameState.info.action !== undefined && condition.notActions.indexOf(gameState.info.action) === -1);
		}
		if(condition.random !== undefined && condition.randomRange !== undefined){
			let randomTest = random(condition.randomRange[0],condition.randomRange[1]);
			return (randomTest <= condition.random);
		}
		if(condition.haveHousemate !== undefined){
			let housematesActif = getHousemateId('actif');
			return (condition.haveHousemate?housematesActif.length > 0:housematesActif.length == 0);
		}
		if(condition.difficulty !== undefined){
			let difficulty = getStorage('difficulty');
			let difficulties = Object.keys(window.database.difficulty);
			if(condition.difficulty.min !== undefined){
				return difficulties.indexOf(condition.difficulty.min) <= difficulties.indexOf(difficulty);
			}else if(condition.difficulty.max !== undefined){
				return difficulties.indexOf(condition.difficulty.max) >= difficulties.indexOf(difficulty);
			}else if(condition.difficulty.equal !== undefined){
				return difficulties.indexOf(condition.difficulty.equal) == difficulties.indexOf(difficulty);
			}
			return false;
		}

	//Test Values
		if(condition.key !== undefined){
			let value = undefined;
			if(condition.typeVar !== undefined){
				if(condition.typeVar == 'characters' && condition.key != 'count'){
					let who = condition.key.split('.')[0];
					let newKey = condition.key.split('.').slice(1).join('.');
					value = gObj(getCharacter(who),newKey);
				}else if(condition.key == 'giveSlut'){
					value = parseInt(character.giveSlut());
				}else{
					value = gObj(getStorage(condition.typeVar),condition.key);
				}
			}else if(condition.key == 'giveSlut'){
				value = parseInt(character.giveSlut());
			}else{
				value = character.get(condition.key);
			}

			if(condition.compare !== undefined && condition.to !== undefined){
				let valueCompared = null;
				if(condition.typeVar == 'characters' && condition.compare != 'count'){
					let who = condition.compare.split('.')[0];
					let newKey = condition.compare.split('.').slice(1).join('.');
					valueCompared = gObj(getCharacter(who),newKey);
				}else if(condition.compare == 'giveSlut'){
					valueCompared = parseInt(character.giveSlut());
				}else{
					valueCompared = gObj(getStorage(condition.typeVar),condition.compare);
				}
				condition[condition.to] = valueCompared;
			}

			if(value === undefined){
				if(condition.empty !== undefined)	//If it's not there it's empty
					return true;
				else if(arrayInter(Object.keys(condition),['less','more','moreOrEqual','lessOrEqual']).length > 0)
					value = 0;
				else
					return false;
			}

			if (condition.val !== undefined && condition.val != value){
				return false;
			}else if(condition.not !== undefined && condition.not == value){
				return false;
			}else if(condition.in !== undefined){
				if(value instanceof Array){
					let inter = arrayInter(value,condition.in);
					if(inter.length == 0)
						return false;
				}else if(condition.in.indexOf(value) == -1){
					return false;
				}
			}else if(condition.notin !== undefined){
				if(value instanceof Array){
					let inter = arrayInter(value,condition.notin);
					if(inter.length > 0)
						return false;
				}else if(condition.notin.indexOf(value) != -1){
					return false;
				}
			}else if(condition.more !== undefined){
				if(value instanceof Array){
					value = value.length;
				}else if(condition.more.toString().indexOf('%') !== -1){
					let tmp = condition.more.split('%');
					let condIds = tmp[1].split('.');
					let tmpVal = value[condIds[0]];
					for(let i=1;i<condIds.length;i++){
						tmpVal = tmpVal[condIds[i]];
					}
					condition.more = tmpVal * tmp[0] / 100;
				}
				if(condition.more >= value){
					return false;
				}
			}else if(condition.moreOrEqual !== undefined){
				if(value instanceof Array){
					value = value.length;
				}else if(condition.moreOrEqual.toString().indexOf('%') !== -1){
					let tmp = condition.moreOrEqual.split('%');
					let condIds = tmp[1].split('.');
					let tmpVal = value[condIds[0]];
					for(let i=1;i<condIds.length;i++){
						tmpVal = tmpVal[condIds[i]];
					}
					condition.moreOrEqual = tmpVal * tmp[0] / 100;
				}
				if(condition.moreOrEqual > value){
					return false;
				}
			}else if(condition.less !== undefined){
				if(value instanceof Array){
					value = value.length;
				}else if(condition.less.toString().indexOf('%') !== -1){
					let tmp = condition.less.split('%');
					let condIds = tmp[1].split('.');
					let tmpVal = value[condIds[0]];
					for(let i=1;i<condIds.length;i++){
						tmpVal = tmpVal[condIds[i]];
					}
					condition.less = tmpVal * tmp[0] / 100;
				}
				if(condition.less <= value){
					return false;
				}
			}else if(condition.lessOrEqual !== undefined){
				if(value instanceof Array){
					value = value.length;
				}else if(condition.lessOrEqual.toString().indexOf('%') !== -1){
					let tmp = condition.lessOrEqual.split('%');
					let condIds = tmp[1].split('.');
					let tmpVal = value[condIds[0]];
					for(let i=1;i<condIds.length;i++){
						tmpVal = tmpVal[condIds[i]];
					}
					condition.lessOrEqual = tmpVal * tmp[0] / 100;
				}
				if(condition.lessOrEqual < value){
					return false;
				}
			}else if(condition.empty !== undefined && value !== undefined && ((typeof value === 'object' && Object.keys(value).length > 0)||(typeof value === 'boolean' && value)||(typeof value !== 'object' && value.length > 0))) {
				return false;
			}else if(condition.notempty !== undefined && (value === undefined || ((typeof value === 'object' && Object.keys(value).length == 0)||(typeof value !== 'object' && value.length == 0))) ) {
				return false;
			}else if(condition.range !== undefined){
				return (condition.range[0] <= value && value <= condition.range[1]);
			}
		}
	return true;
}

//Storage
	function accessStorage(){
		if(sessionStorage.length > 0){
			return sessionStorage;
		}
		return window.localStorage;
	}
	//Create or Set the Storage
	function setStorage(name,value){
		if(name !== null && value !== undefined){
			if (value instanceof Array)
				value = JSON.stringify(value);
			else if (value instanceof Object)
				value = JSON.stringify(value);
			accessStorage().setItem(storagePrefix+profileId+'_'+name,value);
		}
	}
	//Get Storage Info
	function getStorage(name,defaultVal){
		let getValue = accessStorage().getItem(storagePrefix+profileId+'_'+name);
		if(!getValue){
			if(defaultVal !== undefined)
				return defaultVal;
			else
				return false;
		}
		//If it's a json parse the data or give directely the data
		try {
			return JSON.parse(getValue);
		} catch (e) {
			return getValue;
		}
	}
	//Delete Storage
	function deleteStorage(name){accessStorage().removeItem(storagePrefix+profileId+'_'+name);}
	//Erase Everything
	function clearStorage(){
		for(let key in accessStorage()){
			if(key.indexOf(storagePrefix) === 0){
				accessStorage().removeItem(key);
			}
		}
		//accessStorage() = {};
		//accessStorage().clear();
	}
	//Reset the Storage of a profile
	function cleanStorage(type){
		let notThat = ['settings','saves','currentPage','backPage','achievements'];
		if(type == 'all')
			notThat = ['saves'];
		let prefix = storagePrefix+profileId+'_';
		for(let tmpid in notThat){
			notThat[tmpid] = prefix+notThat[tmpid];
		}
		for(let elemId in accessStorage()){
			if(notThat.indexOf(elemId) == -1 && elemId.indexOf(prefix) != -1){
				deleteStorage(elemId.replace(prefix,''));
			}
		}
	}

function addLogs(type, id, text){
	let logs = getStorage(type);
	if(logs == false)
		logs = {};

	if(logs[id] === undefined)
		logs[id] = [];
	logs[id].push(text);

	setStorage(type,logs);
}
function getLogs(type){
	return getStorage(type);
}
function getCharacter(char){
	let chars = getStorage('characters');
	if(chars !== false && chars[char] !== undefined && chars[char] !== false)
		return Object.assign(new Character(), JSON.parse(chars[char]));
	else
		return false;
}
function getRoomPicture(location){								//Give the room picture
	let villa = getStorage('villa');
	let pict = '';
	if(location.indexOf('bedroom.') !== -1){
		let tmp = location.split('.');
		pict = villa.bedrooms[tmp[1]].pict;
	}else if(location == 'bedrooms'){
		pict = villa.hallway;
	}else if(villa[location] !== undefined && typeof villa[location] == 'string'){
		pict = villa[location];
	}else{
		pict = villa.locations[location].pict;
	}

	if(location == 'garden' && villa.pool !== undefined){
		pict = villa.pool;
	}
	return pict;
}
function getLocationDoing(){									//Give the location of action or activity
	let actions = window.database.actions;
	let activities = {'cameraroom':'cameraroom'};
	for(let actionId in actions){
		let action = actions[actionId];
		activities[action.activity] = action.location;
		activities[actionId] = action.location;
	}
	return activities;
}
function setCharacter(char,info){
	let chars = getStorage('characters');
	if(chars == false)
		chars = {};
	chars[char] = info;
	setStorage('characters',chars);
}
function whoIsAround(location){									//Give if housemate are at the location now
	let timeDay = getStorage('gameState').time;

	let peopleLocation = [];
	let housematesId = getHousemateId();
	for(let charId of housematesId){
		let charInfo = getCharacter(charId);
		if(charInfo.get('schedule')[timeDay] !== undefined){
			let locaPeople = charInfo.get('schedule')[timeDay].location;
			if(locaPeople == 'bedroom')
				locaPeople = 'bedroom.'+charId;
			if(location == locaPeople)
				peopleLocation.push({"id":charId,"name":charInfo.get('firstname'),"pict":charInfo.get('pict')});
		}
	}

	return peopleLocation;
}
function giveNewName(gender,lastnameForced){					//Give a unused name
	let usedLastName = [];
	let usedByLastName = {};
	let usedFullName = [];
	let characters = getStorage('characters');
	for(let char in characters){
		let charInfo = getCharacter(char)
		usedLastName.push(charInfo.lastname);
		usedFullName.push(charInfo.firstname+' '+charInfo.lastname);
		if(usedByLastName[charInfo.lastname] === undefined)
			usedByLastName[charInfo.lastname] = [];
		usedByLastName[charInfo.lastname].push(charInfo.firstname);
	}
	let characterSec = getStorage('characterSec');
	for(let char in characterSec){
		let charInfo = characterSec[char];
		if(charInfo.firstname === undefined)
			continue;
		usedLastName.push(charInfo.lastname);
		usedFullName.push(charInfo.firstname+' '+charInfo.lastname);
	}

	
	let listFirstname = (gender == 'man' ? clone(window.database.characterInfo.maleNames) : clone(window.database.characterInfo.femaleNames));
	let listLastname = clone(window.database.characterInfo.lastNames);

	if(lastnameForced !== undefined && usedLastName.indexOf(lastnameForced) !== -1){
		listFirstname = arrayDiff(listFirstname,usedByLastName[lastnameForced]);
		listLastname = [lastnameForced];
	}else{
		listLastname = arrayDiff(listLastname,usedLastName);
	}

	let firstname = pickRandom(listFirstname);
	let lastname = pickRandom(listLastname);

	return {'firstname':firstname,'lastname':lastname,'full':firstname+' '+lastname};
}
function getLocationInfo(loca){									//Give the information of the location
	let villaData = getStorage('villa');
	if(loca == 'bedrooms'){
		infoLocation = {'type':'bedrooms'};
	}else if(loca.indexOf('bedroom') !== -1){
		let tmp = loca.split('.');
		infoLocation = villaData.bedrooms[tmp[1]];
	}else if(loca == 'hallway'){
		infoLocation = {'type':'hallway'};
	}else{
		infoLocation = villaData.locations[loca];
	}

	if(infoLocation !== undefined)
		infoLocation.people = whoIsAround(loca);

	return infoLocation;
}
function getHousemateId(type){									//Give the id of the housemates according to their state
	let charactersId = Object.keys(getStorage('characters'));

	if(type === undefined||type != 'everyone')
		charactersId.splice(charactersId.indexOf('player'),1);

	//See if we need to get ride of defeated housemate
	if(type === undefined||type !== 'all'){
		let settingInfo = setting('defeatedhousemate');
		if(
			settingInfo == 'out'||
			type == 'notout'||
			(type == 'actif' && ['out','passive'].indexOf(settingInfo) !== -1)
		){
			let outList = [];
			for(let participantId of charactersId){
				let participant = getCharacter(participantId);
				if(participant.get('out')){
					outList.push(participantId);
				}
			}
			charactersId = arrayDiff(charactersId,outList);
		}
	}

	return charactersId;
}
function getClothes(type,value,defaultVal = false,color = undefined){
	if(color === undefined){
		let player = getCharacter('player');
		if(player !== false){
			color = window.database.participants[player.archetype].color;
		}
	}

	let keys = [];
	for(let setId in window.database.cloth[type][value]){
		let info = window.database.cloth[type][value][setId];
		if( (color === undefined && info.color === undefined) || (color === info.color) ){
			keys.push(value+'_'+setId);
		}
	}
	if(defaultVal){
		return keys
	}else{
		let save = clone(keys);
		let settingInfo = undefined;
		if(type == 'topCloth')
			settingInfo = setting('clothtopChoose');
		else
			settingInfo = setting('clothbottomChoose');

		for(let key in settingInfo){
			let find = keys.indexOf(key);
			let valSet = settingInfo[key];

			if(find != -1 && valSet == ''){
				keys.splice(find,1);
			}else if(find == -1 && valSet == value){
				keys.push(key);
			}else if(find != -1 && valSet != value){
				keys.splice(find,1);
			}
		}

		//Avoid No Result
		if(keys.length == 0)
			keys = save;
	}
	return keys;
}
function getDayTimeList(type = null){										//Get the list of the different time of day
	let player = getCharacter('player');
	let list = clone(window.database.dayTime);
	if(['nightmare','classic'].indexOf(getStorage('difficulty')) === -1)
		delete list.noon;
	if(type != 'all' || player === false || !player.havePerk('morninglark')){
		delete list.dawn;
	}
	return list;
}
function increaseTime(nb = 1){
	let timeDay = getStorage('gameState').time;

	let dayTime = Object.keys(getDayTimeList('all'));
	let index = dayTime.indexOf(timeDay);

	if(dayTime[index+nb] === undefined){
		return 'nextDay';
	}else{
		return dayTime[index+nb];
	}
}
function giveTimeString(date,type){
	let dateall = new Date(date);
	let dayname = dateall.getUTCDay();
	let days = getTrad('basic.dayname');
	days = Object.values(days);
	let months = getTrad('basic.month');
	months = Object.values(months);

	let text = '';
	if(type === undefined)
		text = ucfirst(days[dateall.getDay()])+', '+dateall.getDate()+' '+ucfirst(months[dateall.getMonth()])+' '+dateall.getFullYear()+'<br>⏲ '+('0' + dateall.getHours()).slice(-2)+':'+('0' + dateall.getMinutes()).slice(-2);
	else if(type === 'dayId')
		text = dateall.getDay();
	else if(type === 'dayname')
		text = ucfirst(days[dateall.getDay()]);
	else if(type === 'month')
		text = ucfirst(months[dateall.getMonth()])
	else if(type === 'monthId')
		text = dateall.getMonth()+1;
	else if(type === 'number')
		text = dateall.getDate();
	else if(type === 'hour')
		text = ('0' + dateall.getHours()).slice(-2);
	else if(type === 'min')
		text = ('0' + dateall.getMinutes()).slice(-2);
	else if(type === 'format')
		text = ('0' + dateall.getDate()).slice(-2)+'/'+('0' + (dateall.getMonth()+1)).slice(-2)+'/'+dateall.getFullYear();
	else if(type === 'formatReverse')
		text = dateall.getFullYear()+'-'+('0' + (dateall.getMonth()+1)).slice(-2)+'-'+('0' + dateall.getDate()).slice(-2);
	else if(type === 'formatFull')
		text = dateall.getFullYear()+'-'+('0' + (dateall.getMonth()+1)).slice(-2)+'-'+('0' + dateall.getDate()).slice(-2)+' '+('0' + dateall.getHours()).slice(-2)+':'+('0' + dateall.getMinutes()).slice(-2)+':00';
	else if(type === 'time')
		text = ('0' + dateall.getHours()).slice(-2)+':'+('0' + dateall.getMinutes()).slice(-2);

	return text;
}
function getPrice(elementId){									//Give the price of stuff
	let player = getCharacter('player');
	let price = window.database.difficulty[getStorage('difficulty')].price;

	if(['calmingtea','braintonic'].indexOf(elementId) !== -1 && player.mod !== undefined && player.mod.endless && player.stats !== undefined && player.stats.objectBuy !== undefined){
		let nbRemedyBought = (player.stats.objectBuy.calmingtea !== undefined ? player.stats.objectBuy.calmingtea : 0) + (player.stats.objectBuy.braintonic !== undefined ? player.stats.objectBuy.braintonic : 0);
		if(nbRemedyBought > 0){
			price = Math.round(price * Math.pow(window.database.difficulty[getStorage('difficulty')].endlessincrease, nbRemedyBought));
		}
	}

	if(player.inventory !== undefined && player.inventory.storevoucher !== undefined)
		price *= 0.9;

	//Perks
		for(let perkId of player.get('perks')){
			let perkInfo = window.database.perks[perkId];
			if(perkInfo.price !== undefined){
				price *= perkInfo.price;
			}else if(perkInfo.priceSmart !== undefined && player.get('bimbo') < 70){
				price *= perkInfo.priceSmart;
			}else if(perkInfo.priceDumb !== undefined && player.get('bimbo') >= 70){
				price *= perkInfo.priceDumb;
			}
		}

	return Math.round(price);
}
function givePartToUsed(choices,character,type){
	let nbStage = window.database.difficulty[getStorage('difficulty')].nbStage;
	let nbChoice = Object.keys(choices).length;
	let typeChoice = null;

	let stateIndex = null;
	if(character.get('id') == 'player'){
		if(['testimonial','album'].indexOf(type) != -1){
			nbStage = Object.keys(window.database.stagePlayerThreshold).length + 1;
			stateIndex = Math.floor((character.bimboStage + character.slutStage)/2);
		}else{
			stateIndex = (Math.round(character.giveExitation()/(100/nbStage)) - 1);
		}
	}else{
		stateIndex = character.get('stage');
	}

	if(nbChoice == nbStage && stateIndex < Object.keys(choices).length){
		typeChoice = Object.keys(choices)[stateIndex];
	}else{
		typeChoice = Object.keys(choices)[Math.floor((nbChoice-1)/nbStage * stateIndex)];
	}

	return typeChoice;
}
function givepictureHypnoHousemate(){							//Get the picture for the ambushes
	let gameState = getStorage('gameState');
	let pictureHousemate = [];
	for(let charIndex in gameState.info.housematesId){
		let charId = gameState.info.housematesId[charIndex];
		let housemateInfo = getCharacter(charId);
		pictureHousemate.push(imgVideo(housemateInfo.giveHypnoFace()));
	}
	return pictureHousemate.join('');
}
function giveDisplay(contentToDisplay,paramsContent){
	let gameState = getStorage('gameState');
	let player = getCharacter('player');
	let villa = getStorage('villa');
	let content = [];

	let vidHypno = [];
	if(paramsContent.hypnoType !== undefined){
		vidHypno = giveHypnoVids(paramsContent.hypnoType);
		if(vidHypno.length == 0)
			vidHypno = giveHypnoVids(paramsContent.hypnoType,true);			//???????
	}

	let index = 0;
	let lastContinue = 'eventContinue0';
	for(let elem of contentToDisplay){
		let contentHere = null;

		//Filter media
		if(elem.sizeBoobs !== undefined && elem.sizeBoobs.indexOf(player.sizeBoobs) === -1)
			continue;

		if(elem.conditions !== undefined && !checkCond(elem.conditions)){
			continue;
		}

		if(elem == 'hypno'){
			let randomOne = vidHypno.splice(random(0,vidHypno.length-1),1);		//Try not having the same
			content.push('<div class="centerContent">'+imgVideo(randomOne[0])+'</div>');
		}else if(elem == 'hypnoHousemate'){
			let hypnoPict = pickRandom(clone(window.database.participants[paramsContent.housemate.get('archetype')].hypnoPicts));
			content.push('<div class="centerContent">'+imgVideo(hypnoPict)+'</div>');
			content.push('<div class="centerContent">'+getTrad('activity.traphousemate.continue',paramsContent)+'</div>');
		}else if(elem == 'givepictureHypnoHousemate'){
			content.push('<div class="centerContent">'+givepictureHypnoHousemate()+'</div>')
		}else if(elem == 'SHOWBOOBSVIEW'){
			let viewPict = player.giveClothImg('topCloth',true);
			content.push('<div class="centerContent">'+getViewHypno(viewPict,'data/img/hypno/hypnoView.mp4')+'</div>');
		}else if(elem.morphface !== undefined){
			let charId = elem.morphface;
			if(charId == 'nexthousemateCurrent')
				charId = player.info.nexthousemateCurrent;
			let charHere = getCharacter(charId);
			contentHere = getTransfo(charHere.get('oldface'),charHere.get('pict'));
		}else if(elem == 'MORPH'){
			elem = {'id':elem,'class':'centerContent'};
			contentHere = getTransfo(player.get('oldface'),player.get('pict'));
			if(player.topCloth !== undefined && player.sizeBoobs !== undefined){
				let pictsBoobsList = player.picturesTypes('topCloth');
				if(pictsBoobsList !== undefined){
					let pictBoobs = pictsBoobsList[pictsBoobsList.length -1];
					pictsBoobsList = player.picturesTypes('topCloth','oldBoobsSet');
					if(pictsBoobsList !== undefined){
						let oldBoobs = pictsBoobsList[pictsBoobsList.length -1];
						contentHere += getTransfo(oldBoobs,pictBoobs);
					}
				}
			}
		}else if(elem == 'MORPHFAIL'){
			elem = {'id':elem,'class':'centerContent'};
			contentHere = imgVideo(player.getLastFace());
			if(player.topCloth !== undefined && player.sizeBoobs !== undefined){
				let pictsBoobsList = player.picturesTypes('topCloth');
				if(pictsBoobsList !== undefined){
					let pictBoobs = pictsBoobsList[pictsBoobsList.length -1];
					pictsBoobsList = player.picturesTypes('topCloth','oldBoobsSet');
					if(pictsBoobsList !== undefined){
						let oldBoobs = pictsBoobsList[pictsBoobsList.length -1];
						contentHere += getTransfo(oldBoobs,pictBoobs);
					}
				}
			}
		}else if(elem == 'BOTTOMCLOTHSHOW'){
			let pictBottom = player.picturesTypes('bottomCloth');
			contentHere = imgVideo(pictBottom[0]);
		}else if(elem == 'TOPCLOTHSHOWNUDE'){
			let topCloth = player.picturesTypes('topCloth');
			contentHere = imgVideo(topCloth[topCloth.length-1]);
		}else if(elem == 'RESUMECHEATS'){
			if(gameState.info.listCheat !== undefined){
				let listCheat = [];
				for(let cheatId of gameState.info.listCheat){
					listCheat.push(getTrad('events.accountant.parts.'+cheatId));
				}
				contentHere = '<ul><li>'+listCheat.join('</li><li>')+'</li></ul>';
			}
			elem = {'who':'accountant','event':gameState.info.eventKept};
		}else if(elem == 'ACTIONTEXT'){
			if(gameState.info.actionEvent !== undefined && gameState.info.actionEvent !== null)
				contentHere = '<div class="centerContent">'+getTrad('activity.'+gameState.info.actionEvent+'.youuse',paramsContent)+'</div>';
			else
				contentHere = '';
		}else if(elem == 'CONTINUE'){		//Separate start from continue
			let nameContinue = 'eventContinue';
			contentHere = '<div class="centerContent"><a class="btn btnChange" data-origin="'+lastContinue+'" data-target="'+nameContinue+(index+1)+'">'+ucfirst(getTrad('basic.continue'))+'</a></div></div><div id="'+nameContinue+(index+1)+'" class="hide">';
			lastContinue = nameContinue+(index+1);
			elem = {"type":elem,"rawText":true};
		}else if(elem.game !== undefined){
			content.push('<div id="gameContener" data-config="'+JSON.stringify(elem.game).replaceAll('"',"'")+'"></div>');
		}else if(elem.characterSecPict !== undefined){
			let characterSec = getStorage('characterSec');
			let charInfo = clone(window.database.characterSec[elem.characterSecPict.type]);
			let setInfo = charInfo.set[characterSec[elem.characterSecPict.type].set];
			charInfo.set = setInfo;
			contentHere = pickRandom(gObj(charInfo,elem.characterSecPict.pict));
			elem.media = contentHere;
		}else if(elem == "PROFILEPICT"){
			let pictureIndex = player.getStateProfile('actual');
			let setPict = window.database.participants[player.get('archetype')].profilePicts[player.get('profilePictsSet')];
			picture = setPict[pictureIndex];
			contentHere = picture
			elem = {"media":contentHere};
		}else if(elem.media !== undefined){
			contentHere = elem.media;
		}else if(elem.room !== undefined){
			contentHere = villa.locations[elem.room].pict;
			elem.media = contentHere;
		}else if(elem == 'ALLPORTRAITS'){
			let picts = [];
			let allChar = arrayShuffle(getHousemateId('everyone'));
			for(let charId of allChar){
				let charHere = getCharacter(charId);
				picts.push(imgVideo(charHere.pict));
			}
			contentHere = '<div class="portraitsShow">'+picts.join('')+'</div>';
		}else if(elem.dualPicture !== undefined){
			let firstPicto = elem.dualPicture[0];
			let secondPicto = elem.dualPicture[1];
			if(Array.isArray(firstPicto)){
				if(elem.setNamePicto1 !== undefined)
					firstPicto = getSetMedia(elem.setNamePicto1,firstPicto);
				else
					firstPicto = pickRandom(firstPicto);
			}

			if(Array.isArray(secondPicto)){
				if(elem.setNamePicto2 !== undefined)
					secondPicto = getSetMedia(elem.setNamePicto2,secondPicto);
				else
					secondPicto = pickRandom(secondPicto);
			}else if(secondPicto.characterSecPict !== undefined){
				let characterSec = getStorage('characterSec');
				let charInfo = clone(window.database.characterSec[secondPicto.characterSecPict.type]);
				let setInfo = charInfo.set[characterSec[secondPicto.characterSecPict.type].set];
				charInfo.set = setInfo;
				contentHere = pickRandom(gObj(charInfo,secondPicto.characterSecPict.pict));
				secondPicto = contentHere;
			}
			contentHere = dualPicture(firstPicto,secondPicto);
		}else if(elem.text !== undefined){
			let text = elem.text.replace('TYPEHYPNO',paramsContent.hypnoType);
			text = getTrad(text,paramsContent);
			content.push(giveDiscussText(elem,text,paramsContent));
		}

		if(contentHere !== null)
			content.push(giveDiscussText(elem,contentHere,paramsContent));

		index++;
	}

	return content;
}
function giveHypnoToUse(){
	let list = Object.keys(window.database.hypnoTypes);
	let player = getCharacter('player');
	if(player.havePerk('crazyworld')){
		return ['serious'];
	}else{
		return arrayDiff(list,['serious']);
	}
}
function giveHypnoVids(typeHypno,all = false){						//Give the available video of hypno
	let listVids = clone(window.database.hypnoTypes[typeHypno].vids);

	if(all)
		return listVids;

	let hypnoDisabled = setting('hypnoDisabled');
	if(hypnoDisabled !== undefined && hypnoDisabled.length > 0){
		let newList = [];
		for(let vidId in listVids){
			let vid = listVids[vidId];
			if(hypnoDisabled.indexOf(vid) === -1)
				newList.push(vid);
		}
		listVids = newList;
	}
	return listVids;
}
function giveDiscussText(elem,text,paramsContent){

	let classText = 'centerContent';
	let classSurdef = null;
	if(elem.class !== undefined){
		classText = elem.class;
		classSurdef = elem.class;
	}

	let player = getCharacter('player');
	let characterSec = getStorage('characterSec');
	if(elem.who !== undefined && elem.who !== null){
		let pict;let name;let characterHere;
		if(elem.who == 'player'){
			characterHere = player;
		}else if(elem.who == 'nexthousemateCurrent'){
			characterHere = getCharacter(player.info.nexthousemateCurrent);
		}else if(elem.who == 'randomhousemate'){
			characterHere = getCharacter(getStorage('randomhousemate'));
		}else if(elem.who.indexOf('housemate') !== -1){
			characterHere = paramsContent[elem.who];
		}else if(characterSec[elem.who] !== undefined){					//CharacterSec
			let infoCharSec = window.database.characterSec[elem.who];
			let dataCharSec = characterSec[elem.who];
			let pictType = (elem.pictType !== undefined ? elem.pictType : 'speaking');
			pict = pickRandom(clone(infoCharSec.set[dataCharSec.set][pictType]));
			name = getTrad(dataCharSec.name);
			if(elem.name !== undefined)
				name = getTrad(elem.name);
		}else if(elem.who == 'other'){
			if(elem.setName !== undefined){
				pict = getSetMedia(elem.setName,elem.pics);
			}else{
				pict = pickRandom(elem.pics);
			}
			name = getTrad(elem.name);
		}

		if(characterHere !== undefined){
			pict = characterHere.get('pict');
			if(elem.pictType == 'hypnoPicts'){
				if(elem.who == 'player')
					pict = characterHere.getHypnoFace();
				else if(characterHere.giveHypnoFace() !== '')
					pict = characterHere.giveHypnoFace();
			}else if(elem.pictType == 'brainfuck')
				pict = pickRandom(clone(window.database.participants[characterHere.get('archetype')]['hypnoPicts']));
			else if(elem.pictType == 'oldface')
				pict = characterHere.get('oldface');
			else if(elem.pictType == 'startface')
				pict = characterHere.starting.face;
			else if(elem.pictType == 'laughing')
				pict = characterHere.getHappyFace();
			else if(elem.pictType == 'last')
				pict = characterHere.getLastFace();
			else if(elem.pictType == 'faceless')
				pict = characterHere.faceless;
			else if(elem.pictType == 'beenHypno')
				pict = pickRandom(clone(window.database.participants[characterHere.get('archetype')].hypnoPicts));
			else if(elem.pictType == 'gagged' && window.database.participants[characterHere.get('archetype')].picts.gagged !== undefined)
				pict = window.database.participants[characterHere.get('archetype')].picts.gagged;
			name = characterHere.getName();
		}

		return discuss(pict,name,text,classSurdef);
	}else if(elem.raw !== undefined){
		return elem.raw;
	}else if(elem.media !== undefined){
		if(elem.setName !== undefined && typeof text === 'object'){
			text = getSetMedia(elem.setName,elem.media);
		}else if(typeof text === 'object'){
			text = pickRandom(text);
		}
		return '<div class="'+classText+'">'+imgVideo(text)+'</div>';
	}else if(elem.hypno !== undefined){
		let hypnoChoosed = null;
		if(elem.hypno == 'inherit')
			hypnoChoosed = paramsContent.hypnoType;
		if(elem.hypno !== 'random')
			hypnoChoosed = elem.hypno;
		else
			hypnoChoosed = pickRandom(giveHypnoToUse());

		let listVids = giveHypnoVids(hypnoChoosed);

		let contentDisplay = [];
		if(listVids.length > 0){
			let vid = pickRandom(listVids);

			let hypnoPict = '';
			if(elem.pictType !== undefined && elem.pictType == 'oldface' && player.get('oldArchetype') !== undefined)
				hypnoPict = player.getHypnoFace('oldArchetype');
			else
				hypnoPict = player.getHypnoFace();

			let hypnoText = getTrad('hypnoTypes.'+hypnoChoosed+'.continue');

			contentDisplay.push('<div class="'+classText+'">'+imgVideo(vid)+'</div>');

			if(elem.hypnoOnlyVid === undefined||!elem.hypnoOnlyVid){
				contentDisplay.push(discuss(hypnoPict,majText(getTrad('basic.you')),hypnoText));
			}
		}

		return contentDisplay.join('');
	}else if(elem.rawText !== undefined && elem.rawText){
		return text;
	}else{
		return '<div class="'+classText+'">'+text+'</div>';
	}
}

//To fix the issu with F5 which keep play again stats
function saveStateGame(){
	setStorage('stateGame',getSaveInfo());
}
function loadStateGame(){
	let save = getStorage('stateGame');
	if(save !== false){
		for(let elem of elemsToSave){
			if(save[elem] === undefined||save[elem] === false){
				deleteStorage(elem);
			}else{
				setStorage(elem,save[elem]);
			}
		}
	}
}
//Give the set of media to show
function getSetMedia(name,medias){
	let sets = getStorage('setsMedia');
	if(sets !== false && sets[name] !== undefined){
		return medias[sets[name]];
	}else{
		let keys = Object.keys(medias);
		let keyRandom = pickRandom(keys);
		if(sets === false)
			sets = {};
		sets[name] = keyRandom;
		setStorage('setsMedia',sets);
		return medias[keyRandom];
	}
}
function clearSetMedia(){deleteStorage('setsMedia');}

//Put a Majuscule on every word
function ucfirst(text){
	let elems = text.split(' ');
	for(let i in elems){
		elems[i] = elems[i].charAt(0).toUpperCase() + elems[i].slice(1);
	}
	return elems.join(' ');
}
//Put a Maj on the first word
function majText(text){
  return text.charAt(0).toUpperCase() + text.slice(1);
}

//Array Utils
	function arrayUnique(arr){return [...new Set(arr)]};
	function arrayDiff(arr1,arr2){ return arr1.filter(x => !arr2.includes(x)); }
	function arrayInter(arr1,arr2){ return arr1.filter(x => arr2.includes(x)); }
	function arrayConcat(arr1,arr2){ return arr1.concat(arr2); }
	function arrayClean(arr1){return arr1.filter(function (el) {return el != null;});}
	function arrayOccurence(arr,sort){
		let counts = {};
		for (let el of arr) {
			counts[el] = counts[el] ? counts[el] + 1 : 1;
		}
		if(sort !== undefined){
			counts = arrayAssocSort(counts);
		}
		return counts;
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
	function arrayFlip(array){
		return Object.entries(array).reduce((obj, [key, value]) => ({ ...obj, [value]: key }), {});
	}
	function arrayFlipNumber(array){
		return Object.entries(array).reduce((obj, [key, value]) => ({ ...obj, [value]: parseInt(key) }), {});
	}
	function arrayAssocSort(arr,asc=true){
		if(asc)
			return Object.entries(arr).sort((a,b)=>a[1]-b[1]).map(el=>el[0]);
		else
			return Object.entries(arr).sort((a,b)=>b[1]-a[1]).map(el=>el[0]);
	}
	function arrayAssocSortFull(arr,asc=true){
		let arrReturn = {};
		let keysAct = Object.keys(arr);
		keysAct.sort(function(a, b){
			return arr[a].localeCompare(arr[b]);
		});
		if(!asc)
			keysAct = keysAct.reverse();
		for(k of keysAct){
			arrReturn[k] = arr[k];
		}
		return arrReturn;
	}
	function pickRandom(arr,nb){
		if(arr !== undefined){
			if(!Array.isArray(arr)){
				return arr;
			}else if(nb === undefined){
				let idRandom = random(0,arr.length-1);
				return arr[idRandom];
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
				return results;
			}
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
	function randomStep(min,max,step){
		let arr = [];
		for(let i=min;i<=max;i+=step){
			arr.push(i);
		}
		return pickRandom(arr);
	}
	function pickRandomPond(arr,nb){
		if(nb === undefined)
			cycle = 1;
		else
			cycle = nb;

		let pondarr = [];
		for(let elemId in arr){
			for(let i=0;i<arr[elemId];i++){
				pondarr.push(elemId);
			}
		}

		let results = [];
		for(let i=0;i<cycle;i++){
			results.push(pickRandom(pondarr));
		}

		if(nb===undefined)
			return results[0];
		else
			return results;
	}

function normalize(val,min,max){
	if(min === undefined)
		min = 0;
	if(max === undefined)
		max = 100;
	return Math.max(min,Math.min(max,val));
}

//Get a value from an object
function gObj(obj, elem) {
	if(typeof obj === 'undefined'){return false;}

	if(elem == '')return obj;
	else if(elem == 'count')return Object.keys(obj).length;

	let i = elem.indexOf('.');
	if(i > -1) {
		return gObj(obj[elem.substring(0, i)], elem.substr(i + 1));
	}
	return obj[elem];
}
//Set a value from an object
function sObj(obj, elem, value) {
	if(typeof obj === 'undefined'){return false;}
	let i = elem.indexOf('.')
	if(i > -1) {
		return sObj(obj[elem.substring(0, i)], elem.substr(i + 1),value);
	}
	if(value !== undefined)
		obj[elem] = value;
	else
		delete obj[elem];
}
//Load the picture to test the size & apply the right video & class
function getPictDisplay(pict,videoSet,videoId){
	let testPict = new Image();
	testPict.src = pict;
	testPict.onload = function()
	{
		size = this.naturalHeight;
		if(size < 420){
			video = pickRandom(videoSet.horizontal);
			addClass(getId('div'+videoId),'displayHorizontal');
			getId(videoId).src = video;
			getId(videoId).load();
			removeClass(getId(videoId),'hide');
		}else{
			video = pickRandom(videoSet.vertical);
			addClass(getId('div'+videoId),'displayVertical');
			getId(videoId).src = video;
			getId(videoId).load();
			removeClass(getId(videoId),'hide');
		}

	}
}

//Display the media (img/video)
function imgVideo(mediaName,altName,textadd){

	if(typeof forceNoPicture !== 'undefined' && forceNoPicture)
		return '';

	if(Array.isArray(mediaName))
		mediaName = pickRandom(mediaName);

	if(mediaName === undefined || typeof mediaName.lastIndexOf !== 'function'){
		console.log('imgVideo Prob');
		return '';
	}

	let typeMedia = "";
	let testFind = mediaName.lastIndexOf('.');
	let result = '';
	if (mediaName.substr(testFind) == '.mp4')typeMedia = 'video';
	if (mediaName.substr(testFind) == '.webm')typeMedia = 'video';
	if (mediaName.substr(testFind) == '.gif')typeMedia = 'gif';

	if(altName === undefined)
		altName = '';

	let displayImg =  'All';	//TODO put that in settings

	if (displayImg == 'All'){
		if (typeMedia == 'video')
			result = '<video src="'+mediaName+'" title="'+altName+'" loop="loop" autoplay="autoplay"></video>';
		else
			result = '<img src="'+mediaName+'" class="imgDisplay" title="'+altName+'" alt="'+altName+'">';
	}else if(displayImg == 'Fix'){
		if (typeMedia == 'gif')
			mediaName = mediaName.substr(0,testFind)+'.jpg';
		result = '<img src="'+mediaName+'" class="imgDisplay" title="'+altName+'" alt="'+altName+'">';
	}else if(textadd !== undefined && textadd !== null){
		result = '<span>'+textadd+'</span>';
	}

	return result;		
}
//Play the transformation animation
function getTransfo(from,to){							
	return '<div class="transfoFace"><img class="transfoFrom" src="'+from+'"><img class="transfoTo" src="'+to+'"></div>';
}
//Play some hypno on picture
function getPictuHypno(pict,videoSet,videoId,classToUse = ''){
	getPictDisplay(pict,videoSet,videoId);
	let tmpVid = pickRandom(videoSet.horizontal);
	return '<div id="div'+videoId+'" class="pictuHypno '+classToUse+'"><img class="pictHypno" src="'+pict+'"><video id="'+videoId+'" class="vidHypno hide" src="'+tmpVid+'" loop="loop" autoplay="autoplay"></div>';
}
//Play some hypno on View
function getViewHypno(pict,video){
	return '<div class="pictuHypno viewHypno"><img class="pictHypno" src="'+pict+'"><video class="vidHypno" src="'+video+'" loop="loop" autoplay="autoplay"></div>';
}
//Take a random Housemate
function randomhousemate(){
	let gameState = getStorage('gameState');
	let currentUsedHousemate = (gameState.info.housematesId !== undefined ? gameState.info.housematesId : []);
	if(currentUsedHousemate.length == 0 && getStorage('randomhousemate') !== false){	//No to have tu current one
		currentUsedHousemate = [getStorage('randomhousemate')];
	}
	let list = getHousemateId();

	list = arrayDiff(list,currentUsedHousemate);
	let choosed = null;
	if(list.length > 0){
		choosed = pickRandom(list);
	}else{
		list = getHousemateId('all');
		choosed = pickRandom(list);
	}
	setStorage('randomhousemate',choosed);
	return '';
}
//Make the popup when buy stuff appear
function showBuyPopup(id){
	let player = getCharacter('player');
	let textPopup = getTrad('basic.bought',{'name':getTrad('buyable.'+id+'.name')});
	let timer = 3000;
	let classHere = ['div-success'];
	if(['boobsenlargement','boobsrejuv','boobsdiminution'].indexOf(id) !== -1){
		let pictsBoobsList = player.picturesTypes('topCloth');
		if(pictsBoobsList !== undefined){
			let pictBoobs = pictsBoobsList[pictsBoobsList.length -1];
			pictsBoobsList = player.picturesTypes('topCloth','oldBoobsSet');
			if(pictsBoobsList !== undefined){
				let oldBoobs = pictsBoobsList[pictsBoobsList.length -1];
				textPopup = getTransfo(oldBoobs,pictBoobs) + textPopup;
				timer = 7000;
			}
		}
	}else if(['qualitydocumentary'].indexOf(id) !== -1){
		let vidsSlut = pickRandom(clone(window.database.hypnoTypes.slut.vids));
		textPopup = imgVideo(vidsSlut)+'<div class="centerContent">'+discuss(player.getFace(),player.getName(),getTrad('hypnoTypes.slut.continue'))+'</div>';
		classHere.push('buyStuff');
	}else if(['mooduplifter'].indexOf(id) !== -1){
		textPopup = imgVideo('data/img/events/special_eyesdilated01.mp4')+'<div class="centerContent">'+discuss(player.getFace(),player.getName(),getTrad('basic.whaou'))+'</div>';
		classHere.push('buyStuff');
	}

	showPopup(textPopup,classHere,timer);
}
//Show the popup with the votes
function popupVotes(data){
	let nbVotes = Math.round(data.nbVote !== undefined ? data.nbVote : 0);
	let nbFans = Math.round(data.nbFans !== undefined ? data.nbFans : 0);
	if(setting('showpoints') && (nbVotes != 0||nbFans != 0||data.occuActivity > 0)){
		let newVotesDiv = document.createElement('div');

		let classNerf = '';
		let iconType = 'icon-heart';
		let textVote = getTrad('basic.votegain',{'nbvote':nbVotes});
		if(nbFans != 0){
			textVote = getTrad('basic.fansgain',{'nbfans':nbFans});
			newVotesDiv.className = 'fansService';
			iconType = 'icon-fan';
		}

		if(nbVotes < 0||nbFans < 0){
			newVotesDiv.className += ' echec';
			textVote = (nbVotes < 0 ? getTrad('basic.votelose',{'nbvote':nbVotes}) : getTrad('basic.fanslose',{'nbfans':nbFans}));
		}
		if(data.occuActivity !== undefined && data.occuActivity > 0)
			classNerf = 'voteWarning';
		if(nbVotes == 0 && nbFans == 0){
			classNerf = 'voteDanger';
			textVote = getTrad('basic.novotegain');
		}

		newVotesDiv.innerHTML = '<span class="icon '+iconType+'"></span><span id="popupVotesContent" class="'+classNerf+'">'+textVote+'</span><span class="icon '+iconType+'"></span>';
		getId('popupVotes').appendChild(newVotesDiv);
		addClass(newVotesDiv,'open');
		setTimeout(function() {removeClass(newVotesDiv,'open');}, 100);
		setTimeout(function() {addClass(newVotesDiv,'close');}, 3000);
		setTimeout(function() {getId('popupVotes').removeChild(newVotesDiv);}, 6000);
	}
}
//Show the Popup and can put a timer on it
function showPopup(text,classChoosed,timer = null){
	removeClass(getId('popup'),'hide');
	let popup = getId('popup');
	popup.innerHTML = text;
	emptyClass(popup);

	if(classChoosed !== undefined){
		addClass(popup,classChoosed);
	}

	if(timer !== null){
		function closePopup(){
			getId('popup').innerHTML = '';
			addClass(getId('popup'),'hide');
		}
		setTimeout(closePopup,timer);
	}
	getId('popup').onclick = function(){
		getId('popup').innerHTML = '';
		addClass(getId('popup'),'hide');
	}
}
//Show the achievement
function showAchievement(id,type,element){
	let newPopup = document.createElement("div");
	newPopup.className = 'achievementBlock unlocked';

	let aInfo = window.database.achievements[type][id];

	newPopup.innerHTML = `<div class="achievementPicture">
								<img src="`+aInfo.img+`">
							</div>
							<div class="achievementText">
								<div class="achievementTitle">`+getTrad('achievements.'+id+'.title')+`</div>
								<div class="achievementDesc">`+getTrad('achievements.'+id+'.desc')+`</div>
							</div>`;
	element.appendChild(newPopup);
	addClass(newPopup,'open');
	setTimeout(function() {removeClass(newPopup,'open');}, 100);
	setTimeout(function() {addClass(newPopup,'close');}, 3000);
	setTimeout(function() {newPopup.remove();}, 6000);
}
//Test if win achievements
function testAchievement(type){
	let win = [];

	let achievementsUnlocked = getStorage('achievements');
	if(achievementsUnlocked === false)
		achievementsUnlocked = {};
	for(let aId in window.database.achievements[type]){
		let aInfo = window.database.achievements[type][aId];
		if(achievementsUnlocked[aId] === undefined){
			if(aInfo.conditions !== undefined){
				if(checkCond(aInfo.conditions)){
					let dateNow = new Date();
					achievementsUnlocked[aId] = dateNow.getFullYear()+'-'+('0' + (dateNow.getMonth()+1)).slice(-2)+'-'+dateNow.getDate()+' '+('0' + dateNow.getHours()).slice(-2)+':'+('0' + dateNow.getMinutes()).slice(-2);
					win.push(aId);
				}
			}
		}
	}

	if(win.length > 0)
		setStorage('achievements',achievementsUnlocked);

	return win;
}

/******************************/
/********* MANAGER ************/
/******************************/

//PROFILES
	function getAllProfiles(){
		let profiles = accessStorage().getItem(storagePrefix+'profiles');
		if(profiles === null)
			profiles = '{}';
		return JSON.parse(profiles);
	}
	function addProfile(id,data){
		let profiles = getAllProfiles();
		profiles[id] = data;
		accessStorage().setItem(storagePrefix+'profiles',JSON.stringify(profiles));
	}
	function changeProfile(id){
		accessStorage().setItem(storagePrefix+'profileId',id);profileId = id;
		manageProfileName();
		deleteStorage('characters');
		loadingStart();
		getId('main-gamewindow').style.display = 'none';
	}
	function getProfile(id){
		let profiles = getAllProfiles();
		return profiles[id];
	}
	function getProfileId(){return accessStorage().getItem(storagePrefix+'profileId');}
	function getCurrentProfile(){
		let id = getProfileId();
		return getProfile(id);
	}
	function deleteProfile(id){
		let profiles = getAllProfiles();
		delete profiles[id];
		accessStorage().removeItem(storagePrefix+id+'_backPage');
		accessStorage().removeItem(storagePrefix+id+'_currentPage');
		accessStorage().setItem(storagePrefix+'profiles',JSON.stringify(profiles));
	}
	function manageProfile(newProfil){
		profileId = getProfileId();

		let startEmpty = newProfil === undefined;

		if(profileId === null)
			newProfil = 'Default';

		//If no profile set, create one
		if(newProfil !== undefined){
			let id = newProfil.toLowerCase().replaceAll(' ','');
			let currentDate = new Date();
			currentDate = currentDate.toISOString().replace('T',' ').slice(0,-5);
			profileData = {
				"id":id,
				"name":newProfil,
				"created_at":currentDate,
				"played":0,
				"version":window.database.version
			};

			changeProfile(id);
			addProfile(id,profileData);
			setStorage('backPage','main-menu');

			if(!startEmpty){
				let from = getStorage('currentPage');
				showPage(from,'main-menu');
			}
		}
	}
	//Display Name of Profile
	function manageProfileName(){
		let infoProfile = getCurrentProfile();
		if(infoProfile !== undefined){
			getId('nameProfile').innerHTML = infoProfile.name;
		}else{
			getId('nameProfile').innerHTML = '';
		}
	}

//Settings
	function manageMenu(){
		//Manage Menu
		let menuDisplay = getId('menuDisplay');
		let gameState = getStorage('gameState');
		menuDisplay.innerHTML = '';
		for(let menuId in window.database.mainMenu){
			let menu = window.database.mainMenu[menuId];
			if(menuId == 'mainMenu-gamewindow' && (getStorage('characters') === false||getCharacter('player') == false||gameState == false||gameState.location == false)){
				menuDisplay.innerHTML += '<li id="'+menuId+'" disabled="disabled"><div class="btn" disabled="disabled"><span class="icon '+menu.icon+'"></span>'+getTrad(menu.trad)+'</div></li>';
			}else if(menuId == 'mainMenu-help'){	//Add the News Button
				menuDisplay.innerHTML += '<li id="'+menuId+'">'+
											'<div class="btn"><span class="icon '+menu.icon+'"></span>'+getTrad(menu.trad)+'</div>'+
											'<span id="showNewsGame" class="icon icon-info btn btn-info"></span>'+
										'</li>';
			}else{
				menuDisplay.innerHTML += '<li id="'+menuId+'"><div class="btn"><span class="icon '+menu.icon+'"></span>'+getTrad(menu.trad)+'</div></li>';
			}
		}
		for(let menuId in window.database.mainMenu){
			let menu = window.database.mainMenu[menuId];
			let domMenu = getId(menuId);
			domMenu.onclick = function() {
				let isDisabled = this.getAttribute('disabled');
				if(isDisabled === null){
					window.scrollTo(0, 0);
					if(menu.method !== undefined){
						window[menu.method]();
					}else{
						let from = getStorage('currentPage');
						showPage(from,menu.page);
					}
				}
				return false;
			};
		}

		//Additionnal control
		getId('showNewsGame').onclick = function(e){
			e.stopPropagation();
			removeClass(getId('newsGame'),'hide');
		};
	}
	function manageLoadingGame(){

		//DarkMode
		if(setting('darkmode')){
			addClass(document.getElementsByTagName('body')[0],'darkmode');
			addClass(getId('mainOption-darkmode'),'icon-toggleOnR');
			removeClass(getId('mainOption-darkmode'),'icon-toggleOffR');
		}else{
			removeClass(document.getElementsByTagName('body')[0],'darkmode');
			addClass(getId('mainOption-darkmode'),'icon-toggleOffR');
			removeClass(getId('mainOption-darkmode'),'icon-toggleOnR');
		}

		manageDitzScreen();
	}
	function manageDitzScreen(){
		let player = getCharacter('player');
		let articleGame = getId('gameContent').querySelector('article');
		removeClass(articleGame,['ditz0','ditz1','ditz2','ditz3','ditz4','ditz5']);
		if(player !== false && player.ditzNumber !== undefined){
			addClass(articleGame,'ditz'+player.ditzNumber);
		}
	}
	function manageSizePicture(){
		let sizepicture = setting('sizepicture');
		if(sizepicture === undefined || sizepicture === 'small'){
			removeClass(getId('pictsPlayer'),'mediumsize');
		}else{
			addClass(getId('pictsPlayer'),'mediumsize');
		}
	}
	function manageShowLogo(){
		if(setting('showlogo')){
			removeClass(getId('logoGame'),'hide');
		}else{
			addClass(getId('logoGame'),'hide');
		}
	}
	function manageFans(){
		if(!setting('fanfeature')){
			addClass(getId('blockVote'),'last');
			addClass(getId('blockFan'),'hide');
		}else{
			removeClass(getId('blockVote'),'last');
			removeClass(getId('blockFan'),'hide');
		}
	}

	function manageLanguage(){
		language = setting('language');
		if(language === undefined)
			language = 'english';
	}

	//Define or give the setting
	function setting(name,value){
		let settings = getStorage('settings');

		if(settings == false){
			settings = {};
		}

		//Surdef for Endless mod
		if(name == 'defeatedhousemate'){
			let player = getCharacter('player');
			if(player !== false && player.mod !== undefined && player.mod.endless){
				return 'out';
			}
		}

		//Surdef with that difficulty
		if(getStorage('difficulty') == 'classic'){
			if(window.database.difficultyClassic[name] !== undefined){
				return window.database.difficultyClassic[name];
			}
		}

		if(value === undefined){
			//Default values
			if(settings[name] === undefined && ['darkmode','showlogo','showpoints','fanfeature','pickupobject'].indexOf(name) !== -1)
				return true;
			if(settings[name] === undefined && name == 'trapssystem')
				return 'tricky';
			if(settings[name] === undefined && name == 'crazyworld')
				return 'octokuro';

			//Give the data
			return settings[name];
		}else{
			settings[name] = value;
			setStorage('settings',settings);
		}
	}

//Gather the text
	function getTradSub(code,nb = 1){
		let parts = code.split('.');
		let text = window.translation[language];
		let i=0;
		do {
			let tmp = text[parts[i++]];
			//If not find we do nothing
			if(tmp === undefined){
				text = code;
				break;
			}else{
				text = tmp;
			}
		} while (i < parts.length);

		if(text instanceof Array){
			if(nb > 1)
				text = pickRandom(text,nb);
			else
				text = pickRandom(text);
		}

		return text;
	}
	function testTrad(code){
		return (code != getTradSub(code));
	}
	function doTrad(text,code,info){
		let gameState = getStorage('gameState');
		let player = getCharacter('player');
		let regexText = /\|([^\|]+)\|/;
		let resMatch = regexText.exec(text);

		while (resMatch !== null) {
			let split = resMatch[1].split('.');
			let replace = '';

			if(split[0] == 'randomhousemate' && getStorage('randomhousemate') !== false){
				info['randomhousemate'] = getCharacter(getStorage('randomhousemate'));
			}else if(split[0] == 'nexthousemateCurrent'){
				info['nexthousemateCurrent'] = getCharacter(player.info.nexthousemateCurrent);
			}else if(split[0] == 'characterSec'){
				let tmp = getStorage('characterSec');
				info = tmp[split[1]];
				resMatch[1] = split.slice(2).join('.');
			}

			if(info !== undefined && info[resMatch[1]] !== undefined){
				replace = info[resMatch[1]];
				replace = getTrad(replace);
			}else if(info !== undefined && (info[split[0]] !== undefined||info.firstname !== undefined)){
				let charInfo = (info[split[0]] !== undefined ? info[split[0]] : info);
				let selector = (info[split[0]] !== undefined ? split[1] : resMatch[1]);

				switch(selector){
					case 'firstnameReal':
						replace = (charInfo.firstnameMan !== undefined ? charInfo.firstnameMan : charInfo.firstname);
						break;
					case 'formal':
						replace = ucfirst(charInfo.gender == 'man'?getTrad('peoplestuff.mr'):getTrad('peoplestuff.miss'))+' '+charInfo.lastname;
						break;
					case 'self':
						replace = (charInfo.gender == 'man'?getTrad('peoplestuff.himself'):getTrad('peoplestuff.herself'));
						break;
					case 'pronoun':
						replace = (charInfo.gender == 'man'?getTrad('peoplestuff.him'):getTrad('peoplestuff.her'));
						break;
					case 'possadj':
						replace = (charInfo.gender == 'man'?getTrad('peoplestuff.his'):getTrad('peoplestuff.her'));
						break;
					case 'posspron':
						replace = (charInfo.gender == 'man'?getTrad('peoplestuff.his'):getTrad('peoplestuff.hers'));
						break;
					case 'smallgender':
						replace = (charInfo.gender == 'man'?getTrad('peoplestuff.boy'):getTrad('peoplestuff.girl'));
						break;
					case 'fungender':
						replace = (charInfo.gender == 'man'?getTrad('peoplestuff.guy'):getTrad('peoplestuff.gal'));
						break;
					case 'haircoloration':
						replace = (charInfo.gender == 'man'?getTrad('peoplestuff.hair.man.'+charInfo.hairColor):getTrad('peoplestuff.hair.woman.'+charInfo.hairColor));
						break;
					case 'subject':
						replace = (charInfo.gender == 'man'?getTrad('peoplestuff.he'):getTrad('peoplestuff.she'));
						break;
					case 'job':
						replace = getTrad('profile.jobs.'+charInfo.job);
						break;
					case 'ianame':
						let characterSec = getStorage('characterSec');
						if(characterSec === false)
							replace = getTrad(window.database.characterSec.ia.name);
						else
							replace = getTrad(characterSec.ia.name);
						break;
					default:
						replace = gObj(info,resMatch[1]);
						break;
				}
			}else{
				switch(resMatch[1]){
					case 'version':
						replace = window.database.version;
						break;
					case 'ianame':
						let characterSec = getStorage('characterSec');
						if(characterSec === false)
							replace = getTrad(window.database.characterSec.ia.name);
						else
							replace = getTrad(characterSec.ia.name);
						break;
					case 'partDay':
						if(gameState.timeActual !== undefined)
							replace = getTrad('basic.time.'+gameState.timeActual.toLowerCase());
						else
							replace = getTrad('basic.time.'+gameState.time.toLowerCase());
						break;
					case 'destination':
						if(gameState.info.destination !== undefined){
							replace = getTrad('locations.'+gameState.info.destination+'.title').toLowerCase();
						}
						break;
				}
			}

			text = text.replace(resMatch[0],replace);

			if(language == 'english')
				text = text.replace("s's","s'");

			resMatch = regexText.exec(text);
		}

		text = getTradParseTrad(text);

		return text;
	}
	function getTrads(code,nb,info){
		if(typeof code !== 'string')
			return code;
		let texts = getTradSub(code,nb);

		let textsFinal = [];
		for(let text of texts){
			textsFinal.push(doTrad(text,code,info));
		}

		return textsFinal;
	}
	//Translation
	function getTrad(code,info){
		if(code instanceof Array)
			code = pickRandom(code);
		if(typeof code !== 'string')
			return code;

		let text = getTradSub(code);

		return doTrad(text,code,info);
	}
	//Translate a page by parsing elements
	function translatePage(pageId){
		let elems = getId(pageId).getElementsByClassName('trad');
		for(let i=0;i<elems.length;i++){
			let tradCode = elems[i].getAttribute('data-trad');
			let text = getTrad(tradCode);
			let options = elems[i].getAttribute('data-option');
			let location = elems[i].getAttribute('data-location');
			if(options !== null){
				options = options.split(',');
				if(options.indexOf('upper') != -1){
					text = text.toUpperCase();
				}else if(options.indexOf('ucfirst') != -1){
					text = ucfirst(text);
				}
			}
			if(location === null||location == 'inner')
				elems[i].innerHTML = text;
			else if(location == 'title')
				elems[i].setAttribute('title',text);
		}
	}
	//Do look for additional trad
	function getTradParseTrad(text){
		let regexText = /\[maj:([^\]]+)\]/g;
		let tmpRes;
		let replaceList = [];
		while ((tmpRes = regexText.exec(text)) !== null) {
			replaceList.push(tmpRes[0]);
		}
		replaceList = [...new Set(replaceList)];	//Delete Dupe
		if(replaceList.length > 0){
			for(let element of replaceList){
				let tmpPart = element.substr(5,element.length-6);
				text = text.replaceAll(element,majText(tmpPart));
			}
		}

		regexText = /\[trad:([^\]]+)\]/g;
		replaceList = [];
		while ((tmpRes = regexText.exec(text)) !== null) {
			replaceList.push(tmpRes[0]);
		}
		replaceList = [...new Set(replaceList)];	//Delete Dupe
		if(replaceList.length > 0){
			for(let element of replaceList){
				let tmpPart = element.substr(6,element.length-7);
				text = text.replace(element,getTrad(tmpPart));
			}
		}

		regexText = /\[func:([^\]]+)\]/g;
		replaceList = [];
		while ((tmpRes = regexText.exec(text)) !== null) {
			replaceList.push(tmpRes[0]);
		}
		replaceList = [...new Set(replaceList)];	//Delete Dupe
		if(replaceList.length > 0){
			for(let element of replaceList){
				let tmpPart = element.substr(6,element.length-7);
				tmpPart = tmpPart.split('¤');
				text = text.replace(element,window[tmpPart[0]](tmpPart[1],tmpPart[2]));
			}
		}

		return text;
	}
	//Hide & Show Pages
	function showPage(hide,show){
		translatePage(show);

		if(show == 'main-menu')		//Reload the main menu
			manageMenu();

		if(hide == false){
			let sections = document.getElementsByTagName('section');
			for(let i=0;i<sections.length;i++){
				sections[i].style.display = 'none';
			}
		}else{
			getId(hide).style.display = 'none';
		}
		getId(show).style.display = 'flex';

		if(accessStorage() != {}){
			setStorage('currentPage',show);

			//Avoid loading page and loop
			if(hide != 'loading' && hide != show)
				setStorage('backPage',hide);
		}

		//Clean after
		if(hide == 'dailyPage' && show != 'dailyPage'){
			getId('dailyDitz').querySelector('content').innerHTML = '';
			getId('dailyDream').querySelector('content').innerHTML = '';
			getId('dailyFun').querySelector('content').innerHTML = '';
			getId('dailyRecap').querySelector('content').innerHTML = '';
			getId('dailyFolio').querySelector('content').innerHTML = '';
			getId('dailyHypno').querySelector('content').innerHTML = '';
		}
		if(hide == 'storyPage' && show != 'storyPage'){
			getId('storyPage').innerHTML = '';
		}

		renderStuff();
	}
	function sayingGoodDay(){
		let gameState = getStorage('gameState');
		let timeDay = gameState.time;
		if(gameState.previousTime !== undefined)
			timeDay = gameState.previousTime;

		switch(timeDay){
			case 'morning':return getTrad('basic.goodmorning');break;
			case 'noon':return getTrad('basic.salutation');break;
			case 'afternoon':return getTrad('basic.goodafternoon');break;
			case 'evening':return getTrad('basic.goodevening');break;
			case 'night':return getTrad('basic.goodnight');break;
			case 'nextDay':return getTrad('basic.goodnight');break;
		}
	}
	function giveNameTime(){
		let gameState = getStorage('gameState');
		let timeDay = gameState.time;
		if(gameState.previousTime !== undefined)
			timeDay = gameState.previousTime;
		
		return getTrad('basic.time.'+timeDay.toLowerCase());
	}
	function dualPicture(img1,img2){
		if(img1 == 'hallway'){
			let villa = getStorage('villa');
			img1 = villa.hallway;
		}else if(img1 == 'ROOMPICT'){
			img1 = getRoomPicture(getStorage('gameState').location);
		}
		return '<div class="centerContent dualPicture">'+imgVideo(img1)+imgVideo(img2)+'</div>';
	}
	function sayIf(arg1,arg2){
		let list = {};
		if(arg2 !== undefined){
			list[arg1] = arg2;
		}else{
			list = JSON.parse(arg1);
		}

		let player = getCharacter('player');
		for(let type in list){
			let text = list[type];
			if(type == 'bimboHigh' && player.get('bimbo') >= 75)
				return getTrad(text);
			if(type == 'bimboMid' && player.get('bimbo') >= 50)
				return getTrad(text);
			if(type == 'bimboStart' && player.get('bimbo') >= 25)
				return getTrad(text);
			if(type == 'bimboLow' && player.get('bimbo') < 25)
				return getTrad(text);

			if(type == 'slutHigh' && player.get('slut') >= 75)
				return getTrad(text);
			if(type == 'slutMid' && player.get('slut') >= 50)
				return getTrad(text);
			if(type == 'slutStart' && player.get('slut') >= 25)
				return getTrad(text);
			if(type == 'slutLow' && player.get('slut') < 25)
				return getTrad(text);

			if(type == 'exitedHigh' && player.giveExitation() >= 75)
				return getTrad(text);
			if(type == 'exitedMid' && player.giveExitation() >= 50)
				return getTrad(text);
			if(type == 'exitedStart' && player.giveExitation() >= 25)
				return getTrad(text);
			if(type == 'exitedLow' && player.giveExitation() < 25)
				return getTrad(text);
			if(type == 'default')
				return getTrad(text);
		}

		return '';
	}

//If the page had a method , execute it
function methodPage(currentPage){
	try {
		let elementId = currentPage.replace('main-','mainMenu-');
		if(window.database.mainMenu[elementId] !== undefined){
			if(window.database.mainMenu[elementId].method !== undefined){
				window[window.database.mainMenu[elementId].method]();
			}else{
				let from = getStorage('currentPage');
				showPage(from,window.database.mainMenu[elementId].page);
			}
		}else if(window.database.pagesOther[currentPage] !== undefined){
			window[window.database.pagesOther[currentPage].method]();
		}
	}catch(error){
		console.log('error3',error);
		showError(error);
		let from = getStorage('currentPage');
		showPage(from,'main-menu');
	}
}

//First Loading
function loadingStart(){
	manageProfile();
	manageLanguage();
	manageLoadingGame();
	manageSizePicture();
	manageShowLogo();
	manageMenu();
	manageProfileName();

	//Set up the setting
	if(setting('participantsDisabled') === undefined){
		let strikeThem = [];
		for(let id in window.database.participants){
			let info = window.database.participants[id];
			if(info.uncheck !== undefined && info.uncheck){
				strikeThem.push(id);
			}
		}
		setting('participantsDisabled',strikeThem);
	}

	if(window.location.href.indexOf('reset=1') !== -1)
		clearStorage();
	else if(window.location.href.indexOf('reset=2') !== -1)
		cleanStorage('all');	//all except the saves

	//Display the page
	let currentPage = getStorage('currentPage');
	if(currentPage === false){
		currentPage = 'main-menu';
	}else{
		methodPage(currentPage);
	}

	if(currentPage !== 'main-gamewindow'){
		getId('main-gamewindow').style.display = 'none';	
	}
	showPage('loading',currentPage);
}

function activatePageTabs(pageId){
	let btnSwitch = getId(pageId).querySelectorAll('.subPageTitle div:not(.hide)');
	for(let btnHere of btnSwitch){
		removeClass(btnHere,'firstChild');
		removeClass(btnHere,'lastChild');
		btnHere.onclick = function() {
			let target = this.getAttribute('data-target');
			let btnAll = getId(pageId).querySelectorAll('.subPageTitle div');
			for(let btn of btnAll){
				removeClass(btn,'selected');
			}
			addClass(this,'selected');

			let contents = getId(pageId).querySelectorAll('content');
			for(let cont of contents){
				removeClass(cont,'hide');
				addClass(cont,'hide');
			}
			let contentHere = getId(target);
			removeClass(contentHere,'hide');
		};
	}

	//Style
	addClass(btnSwitch[0],'firstChild');
	addClass(btnSwitch[btnSwitch.length-1],'lastChild');
}

function characterShortInfo(charId,addClass = ''){
	let charInfo = getCharacter(charId);
	let role = majText(getTrad('role.'+charInfo.role+'.single'));
	let name = (charInfo.publicInfo.name ? charInfo.firstname+' '+charInfo.lastname : majText(getTrad('basic.unknown')));
	let detail = [];
	let age = (charInfo.publicInfo.age ? charInfo.age+' '+getTrad('backgroundsparts.yearsold') : ( charInfo.publicInfo.seeFace ? majText(getTrad('agerange.'+charInfo.ageRange)) : '' ));
	if(age !== '')
		detail.push(age);
	let gender = (charInfo.publicInfo.gender ? getTrad('characterinfo.gender.'+charInfo.gender) : ( charInfo.publicInfo.seeFace ? (charInfo.gender == 'man' ? getTrad('characterinfo.gender.man') : getTrad('characterinfo.gender.woman')) : '' ));
	if(gender !== '')
		detail.push(gender);
	let face = (charInfo.publicInfo.seeFace ? charInfo.bodypart.face.pict : (charInfo.publicInfo.gender ? ( charInfo.gender == 'man' ? window.database.characterInfo.pictDefaultMan : window.database.characterInfo.pictDefaultWoman ) : 'data/img/icon/icon-question2.svg'));
	let classImg = (face == 'data/img/icon/icon-question2.svg' ? 'faceUnknown' : '');

	return '<div class="smallDetailChar '+addClass+'" data-id="'+charId+'" title="'+name+'">'+
				'<img class="'+classImg+'" src="'+face+'" alt="'+name+' picture">'+
				'<div class="role">'+role+'</div>'+
				'<div class="name">'+name+'</div>'+
				'<div class="detail">'+detail.join(' ')+'</div>'+
			'</div>';
}
function characterShortInfoControl(elementId){
	let listChar = getId(elementId).querySelectorAll('.smallDetailChar');
	listChar.forEach(function(element){
		element.onclick = function(e) {
			let idChar = this.getAttribute('data-id');
			characterDetails(idChar);
		}
	});
}

function archetypeDispo(type){
	let participantsDisabled = setting('participantsDisabled');
	if(participantsDisabled === undefined || participantsDisabled === false)
		participantsDisabled = [];

	let player = getCharacter('player');
	let housemates = getHousemateId('everyone');
	if(type == 'notused'){
		housemates = getHousemateId('all');
		type = 'available';
	}
	let alreadyUsed = [player.archetype];
	if(housemates.length > 0){
		for(let housemateId of housemates){
			let housemate = getCharacter(housemateId);
			alreadyUsed.push(housemate.archetype);
		}
	}

	let archetypeAvailables = [];
	let participants = window.database.participants;
	for(let participantId in participants){
		let participant = participants[participantId];

		if(type != 'start' && setting('crazyworld') == 'octokuro' && participantId == 'octokuro')
			continue;

		if(participantsDisabled.length > 0 && participantsDisabled.indexOf(participantId) !== -1)
			continue;

		//Take anything but the player current and first one
		if(type !== undefined && type == 'noplayer' && ( player.archetype == participantId || player.starting.archetype == participantId) )
			continue;

		//If currently use don't take it
		if(type !== undefined && type == 'available' && alreadyUsed.indexOf(participantId) !== -1)
			continue;

		archetypeAvailables.push(participantId);
	}
	return archetypeAvailables;
}

function discuss(pict,name,text,classText){
	if(classText === undefined||classText == null)
		classText = 'discussLine';

	return '<div class="'+classText+'">'+
				(pict !== undefined ? '<div class="discussPict">'+imgVideo(pict)+'</div>' : '')+
				'<div class="discussZone">'+
					'<div class="discussName">'+name+'</div>'+
					'<div class="discussText">'+text+'</div>'+
				'</div>'+
			'</div>';
}

//Determine the level (fleme to seek the good expression ^^)
function giveHypnoLvl(){
	let dayNumber = getStorage('dayNumber') - 1;

	let speed = window.database.difficulty[getStorage('difficulty')].hypno.speed;

	let simpleProb = 0;
	let softProb = 0;
	let standardProb = 0;
	let hardProb = 0;
	if(dayNumber < speed[0]){
		simpleProb = -30*dayNumber/(speed[0]/2) + 60;
		softProb = 15*dayNumber/(speed[0]/2) + 30;
		standardProb = 9*dayNumber/(speed[0]/2) + 7;
	}else if(dayNumber < speed[0]+speed[1]){
		softProb = -30*(dayNumber-speed[0])/(speed[1]/2)+60;
		standardProb = 20*(dayNumber-speed[0])/(speed[1]/2)+25;
	}else{
		standardProb = -22.5*(dayNumber-speed[0]-speed[1])/(speed[2]/2)+65;
	}
	hardProb = 100 - (simpleProb+softProb+standardProb);

	simpleProb = normalize(Math.round(simpleProb),0,100);
	softProb = normalize(Math.round(softProb),0,100);
	standardProb = normalize(Math.round(standardProb),0,100);
	hardProb = normalize(Math.round(hardProb),0,100);

	let proba = {
		"simple":[0,simpleProb],
		"soft":[simpleProb,simpleProb+softProb],
		"standard":[simpleProb+softProb,simpleProb+softProb+standardProb],
		"hard":[simpleProb+softProb+standardProb,100],
	};
	let hypnoLvlKept = null;
	let randomPick = random(0,100);

	for(let hypnoLvl in proba){
		let prob = proba[hypnoLvl];
		if(prob[0] <= randomPick && randomPick <= prob[1]){
			hypnoLvlKept = hypnoLvl;
			break;
		}
	}

	return hypnoLvlKept;
}

//NextDay Helper
	function afterDream(){
		let gameState = getStorage('gameState');
		let infoFunTime = pickFunTime(gameState);
		for(let key in infoFunTime){gameState.info[key] = infoFunTime[key];}
		setStorage('gameState',gameState);
		addClass(getId('dailyDream'),'hide');

		//Refresh the perks
			getId('perksList').innerHTML = dailyRecapPerks(gameState);
			renderStuff();

		if(gameState.info.funtimeId !== undefined && gameState.info.funtimeId !== null){
			removeClass(getId('dailyFun'),'hide');
			showFunTime(gameState);
		}else if(gameState.info.newChar !== undefined && gameState.info.newChar.length > 0){
			removeClass(getId('dailyEndless'),'hide');
		}else{
			removeClass(getId('dailyRecap'),'hide');
		}
		window.scrollTo(0, 0);
	}
	function giveMastList(type,typeMast){
		let player = getCharacter('player');
		let listAvailable = [];
		let color = window.database.participants[player.archetype].color;
		for(let elemId in window.database.morning.masturbation[type][typeMast]){
			let elem = window.database.morning.masturbation[type][typeMast][elemId];
			if( ( color === undefined && elem.color === undefined) || (color === elem.color) )
				listAvailable.push(elemId);
		}
		console.log(type,typeMast,listAvailable);
		return listAvailable;
	}
	function pickFunTime(gameState){								//Give if the player is in good mood today
		let player = getCharacter('player');
		let typeMast = window.database.morning.masturbationType[player.get('sizeBoobs')];

		let info = {};

		//If no dream OR need to mastu(from dream) OR it's already decided not to get some OR have the right perk
		if(gameState.info.dream.dreamKept === null || gameState.info.funType !== undefined || player.havePerk('solominx')){
			let sextoys = player.doHave('sextoys');
			if(gameState.info.funType !== undefined){
				info.funType = gameState.info.funType;
				info.funtimeId = pickRandom(giveMastList(info.funType,typeMast));
				player.set('stats.masturbated','++');
			}else if(sextoys){
				let randomPointer = 33;		//With stage 1 => 33%
				if(sextoys.stage > 1)
					randomPointer += 33;	//With stage 2 => 66%
				if(sextoys.stage > 2)
					randomPointer += 24;	//With stage 3 => 90%
				let randomPick = random(0,100);

				if(player.havePerk('solominx'))
					randomPick = 0;

				if(randomPick <= randomPointer){
					info.funType = 'dildo';
					info.funtimeId = pickRandom(giveMastList(info.funType,typeMast));
					player.set('stats.masturbated','++');
				}
			}else{	//No dream, no toys
				let randomPick = random(0,100);
				let randomPointer = 10 - (9 - (player.slut * 0.09));	//Base 1% , at 100% slut it will be 10%

				if(player.havePerk('solominx'))
					randomPick = 0;

				if(randomPick <= randomPointer){
					info.funType = 'manual';
					info.funtimeId = pickRandom(giveMastList(info.funType,typeMast));
					player.set('stats.masturbated','++');
				}
			}
		}

		if(info.funtimeId !== undefined){
			if(!player.havePerk('solominx'))
				player.add('slut',5);

			info.addVotesMastu = player.addvotes('funtime');
		}

		return info;
	}
	function showFunTime(gameState){
		let player = getCharacter('player');
		if(gameState.info.funtimeId !== undefined && gameState.info.funtimeId !== null){
			let typeMast = window.database.morning.masturbationType[player.get('sizeBoobs')];
			let pictsMast = window.database.morning.masturbation[gameState.info.funType][typeMast][gameState.info.funtimeId].display;

			contentDisplay = [];
			contentDisplay.push('<div class="centerContent">'+getTrad('morning.masturbation.start')+'</div>');
			contentDisplay.push('<div class="centerContent">'+imgVideo(pictsMast[0])+'</div>');
			contentDisplay.push('<div class="centerContent">'+getTrad('morning.masturbation.continue'+ucfirst(gameState.info.funType))+'</div>');
			contentDisplay.push('<div class="centerContent">'+imgVideo(pictsMast[1])+'</div>');
			contentDisplay.push('<div class="centerContent">'+getTrad('morning.masturbation.end')+'</div>');
			if(!setting('showpoints')){
				contentDisplay.push('<div class="centerContent">'+getTrad('morning.masturbation.viewers',{"nbvote":gameState.info.addVotesMastu.nbVote})+'</div>');
			}

			getId('dailyFun').querySelector('content').innerHTML = contentDisplay.join('');

			if(gameState.info.dream.dreamKept === null){
				if(!haveClass(getId('dailyDitz'),'hide'))
					getId('dailyDitz').querySelector('.btnChange').setAttribute('data-target','dailyFun');
				else
					removeClass(getId('dailyFun'),'hide');
			}
			if(gameState.info.newChar !== undefined && gameState.info.newChar.length > 0){
				getId('dailyFun').querySelector('.btnChange').setAttribute('data-target','dailyEndless');
			}
			addClass(getId('dailyRecap'),'hide');
		}else{
			if(gameState.info.dream.dreamKept === null && gameState.info.newChar !== undefined && gameState.info.newChar.length > 0){
				removeClass(getId('dailyEndless'),'hide');
			}
		}

		if(!haveClass(getId('dailyFun'),'hide') && gameState.info.addVotesMastu !== undefined){
			popupVotes(gameState.info.addVotesMastu);
		}
	}
	function pickOtherStuff(gameState){								//Give if other Stuff need to be seen at the morning
		let settingEvents = setting('eventsDisabled');
		let events = window.database.events;
		let player = getCharacter('player');

		let info = {};

		for(let eventId in events){
			let infoEvent = events[eventId];
			if(infoEvent.when === undefined || infoEvent.when.indexOf('pickOtherStuff') === -1)
				continue;

			if(settingEvents === undefined || settingEvents.length == 0 || settingEvents.indexOf(eventId) === -1){
				let isGood = checkCond(infoEvent.conditions);
				if(isGood){
					let randomTest = random(0,100);
					if(randomTest < infoEvent.chance[getStorage('difficulty')]){
						let eventsHisto = player.get('stats.eventOtherEncountered');
						if(eventsHisto[eventId] === undefined)
							eventsHisto[eventId] = 0;
						eventsHisto[eventId]++;
						player.set('stats.eventOtherEncountered',eventsHisto);
						info.pickOtherStuff = eventId;
						break;
					}
				}
			}
		}

		return info;
	}
	function doTheNextDay(params,newGameState){						//Play and choose what happen on the morning
		let player = getCharacter('player');
		let infoEvent = testEvent(params);
		if(infoEvent.eventKept !== null){
			newGameState.actionType = 'event';
			newGameState.info = {...newGameState.info,...infoEvent};
		}

		if(player.get('stats.dayWithoutCheating') === undefined)
			player.set('stats.dayWithoutCheating',0);
		player.set('stats.dayWithoutCheating','++');

		//If No Event the player move
		if(newGameState.actionType === undefined||newGameState.actionType == null){
			newGameState.actionType = 'dailyRecap';

			//Next Day
			newGameState.dayNumber++;
			newGameState.time = 'morning';
			if(player.havePerk('morninglark'))
				newGameState.time = 'dawn';

			//Unlock the cameraroom
			newGameState.cameraUsed = false;

			//Check Stage change
				let stagePlayerCooldown = window.database.stagePlayerCooldown;
				let stagePlayerThreshold = window.database.stagePlayerThreshold;
	
				//If the cooldown is passed
				if(player.changeStageDay == 0 || newGameState.dayNumber - player.changeStageDay >= stagePlayerCooldown){
					newGameState.info.changeStage = [];
					let typeStage = ['bimbo','slut'];
					for(let typeId of typeStage){
						let currentStage = parseInt(player[typeId+'Stage']);
						if(player.havePerk('crazyworld')){
							let thresholdCurrent = stagePlayerThreshold[currentStage];
							if(player[typeId] < thresholdCurrent){
								newGameState.info.changeStage.push(typeId);
								player.changeStageDay = newGameState.dayNumber;
								player[typeId+'Stage'] = Math.max(1,currentStage-1);
								player.save();
							}
						}else{
							let thresholdCurrent = stagePlayerThreshold[currentStage+1];
							if(player[typeId] >= thresholdCurrent){
								newGameState.info.changeStage.push(typeId);
								player.changeStageDay = newGameState.dayNumber;
								player[typeId+'Stage'] = Math.min(window.database.maxStageStats,currentStage+1);
								player.save();
							}
						}
					}
				}

			//Check change Passion & Refresh Profile
				if(newGameState.info.changeStage !== undefined && newGameState.info.changeStage.length > 0){
					for(let typeId of newGameState.info.changeStage){
						player.changePassion();
					}
					player.save();
					player.saveProfile(-1);
				}

			//Perks application
				for(let perkId of player.get('perks')){
					let perkInfo = window.database.perks[perkId];
					if(perkInfo.morningEffect !== undefined){
						for(let statId in perkInfo.morningEffect){
							player.add(statId,perkInfo.morningEffect[statId]);
						}
					}
				}
			//Perks Deletion Timeout
				if(player.perksTimer !== undefined && player.perksTimer.length > 0){
					let idsToDelete = [];
					for(let perkTimerId in player.perksTimer){
						let perkTimer = player.perksTimer[perkTimerId];
						if(perkTimer.date <= newGameState.dayNumber){
							let listPerk = [];
							if(newGameState.info.perksWearOff === undefined)
								newGameState.info.perksWearOff = [];
							for(let perk of perkTimer.ids){
								listPerk.push('-'+perk);
								newGameState.info.perksWearOff.push(perk);
							}
							player.addPerks(listPerk);
							idsToDelete.push(perkTimerId);
						}
					}
					if(idsToDelete.length > 0){
						player = getCharacter('player');
						for(let perkTimerId of idsToDelete){
							delete player.perksTimer[perkTimerId];
						}
						player.perksTimer = arrayClean(player.perksTimer);
						if(player.perksTimer.length == 0)
							delete player.perksTimer;
						player.save();
					}
				}

			//Fans Votes
				if(setting('fanfeature') && player.fans > 0){
					let fansVotesMin = window.database.difficulty[getStorage('difficulty')].fansVotesMin;
					newGameState.info.fansVotes = random(Math.ceil(player.fans * fansVotesMin / 100),player.fans);
					player.addvotes('fans-service','fans-service',newGameState.info.fansVotes);
				}

			//Event during the night
				let settingEvents = setting('eventsDisabled');
				let eventsCooldown = getStorage('eventsCooldown');
				//Shuffle (Give new schedule to housemates)
					if(settingEvents === undefined || settingEvents.length == 0 || settingEvents.indexOf('shuffle') === -1){
						if(eventsCooldown === false||eventsCooldown.shuffle === undefined||eventsCooldown.shuffle < newGameState.dayNumber){
							let randomTest = random(0,100);
							if(randomTest < window.database.events.shuffle.chance[getStorage('difficulty')]){
								newGameState.info.haveShuffle = true;
								defineSchedule();
								setStorage('trapUsed',[]);

								if(eventsCooldown === false)
									eventsCooldown = {};
								eventsCooldown.shuffle = newGameState.dayNumber + window.database.events.shuffle.cooldown;
								setStorage('eventsCooldown',eventsCooldown);

								let eventsHisto = player.get('stats.eventOtherEncountered');
								if(eventsHisto['shuffle'] === undefined)
									eventsHisto['shuffle'] = 0;
								eventsHisto['shuffle']++;
								player.set('stats.eventOtherEncountered',eventsHisto);
							}
						}
					}
				//Check Mate (Reset the stage)
					if(settingEvents === undefined || settingEvents.length == 0 || settingEvents.indexOf('checkmate') === -1){
						if(eventsCooldown === false||eventsCooldown.checkmate === undefined||eventsCooldown.checkmate < newGameState.dayNumber){
							let randomTest = random(0,100);

							if(randomTest < window.database.events.checkmate.chance[getStorage('difficulty')]){
								let housemates = getHousemateId();
								let sickHousemate = [];
								for(let id of housemates){
									let housemate = getCharacter(id);
									if(housemate.stage > 0 && housemate.out === false)
										sickHousemate.push(id);
								}

								if(sickHousemate.length > 0){

									newGameState.info.haveCheckmate = pickRandom(sickHousemate);
									let housemate = getCharacter(newGameState.info.haveCheckmate);
									housemate.stage = 0;
									housemate.save();
									
									if(eventsCooldown === false)
										eventsCooldown = {};
									eventsCooldown.checkmate = newGameState.dayNumber + window.database.events.checkmate.cooldown;
									setStorage('eventsCooldown',eventsCooldown);

									let eventsHisto = player.get('stats.eventOtherEncountered');
									if(eventsHisto['checkmate'] === undefined)
										eventsHisto['checkmate'] = 0;
									eventsHisto['checkmate']++;
									player.set('stats.eventOtherEncountered',eventsHisto);
								}
							}
						}
					}

			//Dream
				let dreamObj = new dream();
				getId('dailyDream').dream = dreamObj;
				if(dreamObj.changeTime !== undefined)
					newGameState.time = dreamObj.changeTime;
				newGameState = dreamObj.getData(newGameState);

			//FunTime
				if(newGameState.info.dream.dreamKept === null){
					let infoFunTime = pickFunTime(newGameState);
					for(let key in infoFunTime){newGameState.info[key] = infoFunTime[key];}
				}

			//Add Vote per stage of housemates Corruption
				let corruptpointSetting = setting('corruptpoint');
				if(corruptpointSetting === true){
					newGameState.info.addVotesCorruption = getCharacter('player').addvotes('bonusStage');
				}

			//Mention Body Change
				if(player.starting.archetype != player.archetype && player.starting.transfoMention < 2){
					let perksArch = window.database.participants[player.archetype].perks;
					if(perksArch !== undefined && perksArch.length > 0){
						newGameState.info.mentionId = parseInt(player.starting.transfoMention)+1;
						getCharacter('player').set('starting.transfoMention',newGameState.info.mentionId);
					}
				}

			//Other Stuff
				let infoOtherStuff = pickOtherStuff(newGameState);
				for(let key in infoOtherStuff){newGameState.info[key] = infoOtherStuff[key];}

			//Adjustement
				player = getCharacter('player');
				let randomPointer = 25;			//Base 25% of Adjustments
				if(player.giveExitation() < 30)
					randomPointer = 40;			//If to boring 40%
				let randomPick = random(0,100);

				if(randomPick <= randomPointer){
					newGameState.info.hypnoChoosed = pickRandom(giveHypnoToUse());

					let aiHisto = clone(player.get('stats.aimessing'));
					if(aiHisto[newGameState.info.hypnoChoosed] === undefined)
						aiHisto[newGameState.info.hypnoChoosed] = 0;
					aiHisto[newGameState.info.hypnoChoosed]++;
					player.set('stats.aimessing',aiHisto);
					player.beHypno(newGameState.info.hypnoChoosed,1);
				}
		
			//Manage Endless
				delete newGameState.info.newChar;
				if(player.mod !== undefined && player.mod.endless && getHousemateId().length < window.database.creation.nbParticipants-1){
					newGameState.info.newChar = [];
					let nbMissing = (window.database.creation.nbParticipants-1)-getHousemateId().length;
					for(let ind=0;ind < nbMissing; ind++){
						let archetypeAvailables = archetypeDispo('notused');
						if(archetypeAvailables.length == 0)
							archetypeAvailables = archetypeDispo('noplayer');
						let listBehaviorId = Object.keys(window.database.behaviors);
						listBehaviorId = arrayDiff(listBehaviorId,['default']);
						let randomModel = pickRandom(archetypeAvailables);
						new Character({'idChar':randomModel,'archetype':randomModel,'behavior':pickRandom(listBehaviorId)});
						let characters = Object.keys(getStorage('characters'));
						let lastChar = characters[characters.length-1];

						let newChar = getCharacter(lastChar);
						newChar.saveProfile();

						//Add the room
						let villa = getStorage('villa');
						let imgBedRoomsInUse = [];
						for(let charId of getHousemateId()){
							if(villa.bedrooms[charId] !== undefined){
								imgBedRoomsInUse.push(villa.bedrooms[charId].pict);
							}
						}
						let imgBedRoomsAvailable = arrayDiff(window.database.bedrooms,imgBedRoomsInUse);
						let imgBedroom = pickRandom(imgBedRoomsAvailable);
						villa.bedrooms[lastChar] = {
							'owner':lastChar,
							'pict':imgBedroom,
							'type':'bedroom',
							'activities':window.database.locations.bedroom.activities
						};
						setStorage('villa',villa);

						newGameState.info.newChar.push(lastChar);
					}

					newGameState.info.haveShuffle = true;
					defineSchedule();
					setStorage('trapUsed',[]);
				}
		}

		return newGameState;
	}
	function dailyRecapPerks(gameState, perksForce = null){
		let player = getCharacter('player');
		let perks = (perksForce !== null ? perksForce : player.get('perks'));

		let html = [];
		for(let perk of perks){
			let perkData = clone(window.database.perks[perk]);
			if(perkData.hide !== undefined && perkData.hide)
				continue;

			let infoPerk = false;
			if(setting('perksinfluence') === true){
				infoPerk = getTrad('perks.'+perk+'.effect');
				if(infoPerk === 'perks.'+perk+'.effect' || infoPerk === undefined)
					infoPerk = false;
			}
			let perkPict = perkData.pict;
			if(perkData.pictman !== undefined)
				perkPict = perkData['pict'+player.gender];
			let imgPerkClass = ['recapPicture'];
			let namePerk = '<b>'+getTrad('perks.'+perk+'.name')+'</b>:';
			if(player.perkLock !== undefined && player.perkLock !== null && player.perkLock.indexOf(perk) !== -1){
				imgPerkClass.push('boxAnimate');
				namePerk += '<sub>'+getTrad('basic.locked')+'</sub>';
			}
			html.push('<li>'+
						'<div class="'+imgPerkClass.join(' ')+'">'+imgVideo(perkPict)+'</div>'+
						'<div class="recapText">'+
							namePerk+'<hr class="title">'+getTrad('perks.'+perk+'.desc')+
							(infoPerk !== false ? '<br><i>'+infoPerk+'</i>' : '')+
						'</div>'+
					'</li>');
		}

		//Wear Off
		if(gameState.info.perksWearOff !== undefined && gameState.info.perksWearOff.length > 0){
			for(let perkId of gameState.info.perksWearOff){
				html.push('<li>'+
						'<div class="recapText">'+
							getTrad('perks.'+perkId+'.name')+' '+getTrad('basic.wearoff')+
						'</div>'+
					'</li>');
			}
		}

		return html.join('');
	}

//Load stuff
document.addEventListener('DOMContentLoaded', (event) => {
	if(window.location.pathname.indexOf('reset=1') != -1)
		clearStorage();

	try{	//Try to catch the errors at the loading
		//Popup show the first time and each reset
		if(accessStorage()['popupStart'] === undefined){
			translatePage('popupStart');
			removeClass(getId('popupStart'),'hide');
		}
		getId('closePopupStart').onclick = function(){
			addClass(getId('popupStart'),'hide');
			accessStorage().setItem('popupStart',1);
		};
		getId('btnClosePopupStart').onclick = function(){
			addClass(getId('popupStart'),'hide');
			accessStorage().setItem('popupStart',1);
		};
		getId('titleGame').onclick = function(){
			translatePage('popupStart');
			removeClass(getId('popupStart'),'hide');
		};


		//Popup NewsGame, open when change version
		if(accessStorage()['popupNewsVersion'] === undefined || accessStorage()['popupNewsVersion'] !== window.database.version){
			removeClass(getId('newsGame'),'hide');
		}
		getId('closeNewsGame').onclick = function(){
			addClass(getId('newsGame'),'hide');
			accessStorage().setItem('popupNewsVersion',window.database.version);
		};

		//If we start the game, the currentPage is the Menu
		if(accessStorage() != {} && window.starting !== undefined){
			setStorage('currentPage','main-menu');
			delete window.starting;
		}
		
		loadingStart();
		
		//Popup Close
		getId('popup').onclick = function(){
			getId('popup').innerHTML = '';
			addClass(getId('popup'),'hide');
		}

		manageFans();

		//Btn Refresh All
		let btnRefreshAll = getId('btnRefreshAll');
		if(btnRefreshAll !== undefined && btnRefreshAll !== null){
			btnRefreshAll.onclick = function(){
				retrieveContent();
			};
		}

		//Back Btn
		let backBtn = document.getElementsByClassName('backBtn');
		backBtn = Array.prototype.slice.call( backBtn );
		backBtn.forEach(function(element){
			element.onclick = function() {
				let current = getStorage('currentPage');
				let previous = getStorage('backPage');

				let target = this.getAttribute('data-target');
				if(target !== undefined && target !== null)
					previous = target;

				if(previous == false || previous == current)
					previous = 'main-menu';

				getId('popup').innerHTML = '';
				addClass(getId('popup'),'hide');

				showPage(current,previous);
				return false;
			};
		});

		//Btn swtich part Continue / Next
		let changeSteps = document.getElementsByClassName('changeStep');
		changeSteps = Array.prototype.slice.call( changeSteps );
		changeSteps.forEach(function(element){
			element.onclick = function() {
				let idCurrent = this.getAttribute('data-current');
				if(idCurrent != null){
					let elem = getId(idCurrent);
					addClass(elem,'hide');
					removeClass(elem,'show');
				}
				let idOther = this.getAttribute('data-other');
				if(idOther != null){
					elem = getId(idOther);
					window.scrollTo(0, 0);
					addClass(elem,'show');
					removeClass(elem,'hide');
				}

				try{
					btnStepControl(this);
				}catch(error){
					console.log('error6',error);
					showError(error);
					let from = getStorage('currentPage');
					showPage(from,'main-menu');
				}
			};
		});
	}catch(error){
		console.log('error7',error);
		showError(error);
		let from = getStorage('currentPage');
		showPage(from,'main-menu');
	}
});


/***************************/
/*********** PAGES *********/
/***************************/
	//Give the stats of the current Content
	function giveContentStats(){
		let blocks = [];
		let block = [];
		let tmpText = '';

		//Difficulties
			block = [];
			block.push('<h1>'+getTrad('optionmenu.popupstats.difficultiestitle')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbdifficulties')+':</u> '+Object.keys(window.database.difficulty).length+'</div>');
			let cells = ['difficulty','nbStage','price','endlessincrease','histoActivities','craveCounter','votePerStageBonus','votePerCamera','camNewFans','votePerDiscuss','votePerAction','votePerFuntime','fansVotesMin'];
			tmpText = '<div id="tableDifficulties"><table><thead><tr>';
			for(let cellId of cells){
				let testDesc = getTrad('optionmenu.popupstats.difficulties.'+cellId.toLowerCase()+'desc');
				if(testDesc != 'optionmenu.popupstats.difficulties.'+cellId.toLowerCase()+'desc')
					tmpText += '<td title="'+testDesc+'">'+getTrad('optionmenu.popupstats.difficulties.'+cellId.toLowerCase())+'</td>';
				else
					tmpText += '<td>'+getTrad('optionmenu.popupstats.difficulties.'+cellId.toLowerCase())+'</td>';
			}
			tmpText += '</tr></thead><tbody>';
			for(let difficultyId in window.database.difficulty){
				let infoDifficulty = window.database.difficulty[difficultyId];
				tmpText += '<tr>';
				for(let cellId of cells){
					if(cellId == 'difficulty')
						tmpText += '<td>'+getTrad('newgame.difficulty.'+difficultyId)+'</td>';
					else
						tmpText += '<td>'+infoDifficulty[cellId]+'</td>';
				}
				tmpText += '</tr>';
			}
			tmpText += '</tbody></table></div>';
			block.push(tmpText);
			blocks.push(block.join(''));

		//Models
			block = [];
			let modelPerks = [];
			let infoModels = {'hairColor':{},'sizeBoobs':{},'nbModel':0};
			for(let modelId in window.database.participants){
				let infoModel = window.database.participants[modelId];
				if(infoModels.hairColor[infoModel.hairColor] === undefined)
					infoModels.hairColor[infoModel.hairColor] = 0;
				if(infoModels.sizeBoobs[infoModel.sizeBoobs] === undefined)
					infoModels.sizeBoobs[infoModel.sizeBoobs] = 0;
				infoModels.hairColor[infoModel.hairColor]++;
				infoModels.sizeBoobs[infoModel.sizeBoobs]++;
				infoModels.nbModel++;
				for(let perkId of infoModel.perks){
					if(modelPerks[perkId] === undefined)
						modelPerks[perkId] = [];
					modelPerks[perkId].push(modelId);
				}
			}
			block.push('<h1>'+getTrad('optionmenu.popupstats.models')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbmodels')+':</u> '+infoModels.nbModel+'</div>');
			tmpText = '<ul class="leftContent">';
			for(let hairColor in infoModels.hairColor)
				tmpText += '<li><u>'+ucfirst(getTrad('basic.color.'+hairColor))+':</u> '+infoModels.hairColor[hairColor]+'</li>';
			tmpText += '</ul>';
			block.push(tmpText);
			tmpText = '<ul class="leftContent">';
			for(let sizeBoobs in infoModels.sizeBoobs)
				tmpText += '<li><u>'+getTrad('basic.boobs.'+sizeBoobs)+':</u> '+infoModels.sizeBoobs[sizeBoobs]+'</li>';
			tmpText += '</ul>';
			block.push(tmpText);
			blocks.push(block.join(''));

		//Activities + Action
			block = [];
			let infoActions = {'totalActions':0,'totalActivities':0,'locations':{},'useObject':{}};
			for(let actionsId in window.database.actions){
				let infoAction = clone(window.database.actions[actionsId]);
				if(infoAction.location == 'bedroom')
					infoAction.location = 'bedrooms';
				if(infoActions.locations[infoAction.location] === undefined)
					infoActions.locations[infoAction.location] = {'activities':{}};
				if(infoActions.locations[infoAction.location].activities[infoAction.activity] === undefined){
					infoActions.locations[infoAction.location].activities[infoAction.activity] = 0;
					infoActions.totalActivities++;
				}
				if(infoActions.useObject[infoAction.object] === undefined)
					infoActions.useObject[infoAction.object] = 0;
				infoActions.locations[infoAction.location].activities[infoAction.activity]++;
				infoActions.useObject[infoAction.object]++;
				infoActions.totalActions++;
			}
			block.push('<h1>'+getTrad('optionmenu.popupstats.activitiesactions')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nblocations')+':</u> '+Object.keys(infoActions.locations).length+'</div>');
			tmpText = '<ul class="leftContent">';
			for(let locationId in infoActions.locations){
				tmpText += '<li><u>'+getTrad('locations.'+locationId+'.title')+':</u><ul>';
				for(let activityId in infoActions.locations[locationId].activities)
					tmpText += '<li>'+getTrad('optionmenu.popupstats.nbactionfor')+' '+getTrad('activity.'+activityId+'.title')+': '+infoActions.locations[locationId].activities[activityId]+'</li>';
				tmpText += '</ul></li>';
			}
			tmpText += '</ul>';
			block.push(tmpText);
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbtotalactivities')+':</u> '+infoActions.totalActivities+'</div>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbtotalactions')+':</u> '+infoActions.totalActions+'</div>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbobjects')+':</u> '+Object.keys(infoActions.useObject).length+'</div>');
			tmpText = '<ul class="leftContent">';
			for(let objectId in infoActions.useObject){
				tmpText += '<li>'+getTrad('optionmenu.popupstats.nbusefor')+' '+getTrad('buyable.'+objectId+'.name')+': '+infoActions.useObject[objectId]+'</li>';
			}
			tmpText += '</ul>';
			block.push(tmpText);
			blocks.push(block.join(''));

		//Events
			block = [];
			block.push('<h1>'+getTrad('optionmenu.popupstats.events')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbevents')+':</u> '+Object.keys(window.database.events).length+'</div>');
			blocks.push(block.join(''));

		//Behavior
			block = [];
			let infoBehaviors = {};
			for(let behaviorId in window.database.behaviors){
				let infoBehavior = window.database.behaviors[behaviorId];
				let tmp = {
							'name':ucfirst(behaviorId),
							'ambushes':Object.keys(infoBehavior.hypnoDisplay).length,
							'activities':{},
							'testimonial':0,
						};
				for(let activityId in infoBehavior.activities){
					let nbSet = 0;
					for(let typeAttitude in infoBehavior.activities[activityId]){
						nbSet += Object.keys(infoBehavior.activities[activityId][typeAttitude]).length;
					}
					tmp.activities[activityId] = nbSet;
				}
				for(let testimonialType in window.translation[language].behaviors[behaviorId].testimonial){
					tmp.testimonial += window.translation[language].behaviors[behaviorId].testimonial[testimonialType].length;
				}
				infoBehaviors[behaviorId] = tmp;
			}
			block.push('<h1>'+getTrad('optionmenu.popupstats.behavior')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbbehavior')+':</u> '+Object.keys(infoBehaviors).length+'</div>');
			tmpText = '<ul class="leftContent">';
			for(let behaviorId in infoBehaviors){
				let infoBehavior = infoBehaviors[behaviorId];
				tmpText += '<li><u>'+infoBehavior.name+':</u><ul>';
					tmpText += '<li><u>'+getTrad('optionmenu.popupstats.nbambushes')+':</u> '+infoBehavior.ambushes+'</li>';
					tmpText += '<li><u>'+getTrad('optionmenu.popupstats.nbtestimonial')+':</u> '+infoBehavior.testimonial+'</li>';

					if(Object.keys(infoBehavior.activities).length == 0){
						tmpText += '<li><u>'+getTrad('optionmenu.popupstats.activities')+':</u> 0</li>';
					}else{
						tmpText += '<li><u>'+getTrad('optionmenu.popupstats.activities')+':</u><ul>';
						for(let activityId in infoBehavior.activities)
							tmpText += '<li>'+getTrad('activity.'+activityId+'.title')+': '+infoBehavior.activities[activityId]+'</li>';
						tmpText += '</ul></li>';
					}

				tmpText += '</ul></li>';
			}
			tmpText += '</ul>';
			block.push(tmpText);
			blocks.push(block.join(''));

		//Lootable
			block = [];
			block.push('<h1>'+getTrad('optionmenu.popupstats.lootable')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nblootable')+':</u> '+Object.keys(window.database.lootable).length+'</div>');
			blocks.push(block.join(''));

		//Hypno
			block = [];
			let infoHypnos = {};
			for(let hypnoTypeId in window.database.hypnoTypes){
				let hypnoType = window.database.hypnoTypes[hypnoTypeId];
				let tmp = {
							'name':ucfirst(hypnoTypeId),
							'vids':hypnoType.vids.length
						};
				infoHypnos[hypnoTypeId] = tmp;
			}
			block.push('<h1>'+getTrad('optionmenu.popupstats.hypno')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbhypno')+':</u> '+Object.keys(infoHypnos).length+'</div>');
			tmpText = '<ul class="leftContent">';
			for(let infoHypnoId in infoHypnos){
				let infoHypno = infoHypnos[infoHypnoId];
				tmpText += '<li><u>'+infoHypno.name+':</u> '+infoHypno.vids+'</li>';
			}
			tmpText += '</ul>';
			block.push(tmpText);
			blocks.push(block.join(''));

		//Dream
			block = [];
			block.push('<h1>'+getTrad('optionmenu.popupstats.dream')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbdream')+':</u> '+Object.keys(window.database.morning.dreams).length+'</div>');
			blocks.push(block.join(''));

		//Set Clothes
			block = [];
			let clothToLook = ['topCloth','bottomCloth'];
			let infoClothes = {};
			for(let clothToLookId of clothToLook){
				let infoTmp = {};
				for(let typeBody in window.database.cloth[clothToLookId]){
					let data = window.database.cloth[clothToLookId][typeBody];
					if(data.length == 0||Object.keys(data).length == 0)
						continue;
					infoTmp[typeBody] = Object.keys(data).length;
				}
				infoClothes[clothToLookId] = infoTmp;
			}
			block.push('<h1>'+getTrad('optionmenu.popupstats.clothes')+'</h1>');
			tmpText = '<ul class="leftContent">';
			for(let infoClothId in infoClothes){
				let infoCloth = infoClothes[infoClothId];
				tmpText += '<li><u>'+getTrad('newgame.'+infoClothId)+':</u><ul>';
				for(let typeBody in infoCloth){
					tmpText += '<li>'+ucfirst(typeBody)+': '+infoCloth[typeBody]+'</li>';
				}
				tmpText += '</ul></li>';
			}
			tmpText += '</ul>';
			block.push(tmpText);
			blocks.push(block.join(''));

		//Endings
			block = [];
			let endings = ['wins','loses'];
			let nbEndings = 0;
			for(let endingId of endings){
				for(let typeId in window.database.ending[endingId]){
					let data = window.database.ending[endingId][typeId];
					if(data.nbFinalChoice !== undefined)
						nbEndings += data.nbFinalChoice
					else
						nbEndings++;
				}
			}
			block.push('<h1>'+getTrad('optionmenu.popupstats.endings')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbendings')+':</u> '+nbEndings+'</div>');
			blocks.push(block.join(''));

		//Perks
			block = [];
			block.push('<h1>'+getTrad('optionmenu.popupstats.perks')+'</h1>');
			block.push('<div class="leftContent"><u>'+getTrad('optionmenu.popupstats.nbperks')+':</u> '+Object.keys(window.database.perks).length+'</div>');

			let listPerkModel = [];
			let listPerk = [];
			for(let perk in window.database.perks){
				let infoPerk = false;
				if(setting('perksinfluence') === true){
					infoPerk = getTrad('perks.'+perk+'.effect');
					if(infoPerk === 'perks.'+perk+'.effect' || infoPerk === undefined)
						infoPerk = false;
				}
				let perkPict = window.database.perks[perk].pict;
				if(window.database.perks[perk].pictman !== undefined)
					perkPict = window.database.perks[perk]['pictwoman'];
				let imgPerkClass = ['recapPicture'];
				let namePerk = '<b>'+getTrad('perks.'+perk+'.name')+'</b>:';
				if(modelPerks[perk] !== undefined){
					let imgModel = [];
					for(let modelId of modelPerks[perk]){
						imgModel.push('<span class="perkModelImg">'+imgVideo(window.database.participants[modelId].picts.base)+'</span>');
					}
					let textPerk = `<li>
										<div class="`+imgPerkClass.join(' ')+`"><img src="`+perkPict+`"></div>
										<div class="recapText">
											`+namePerk+`<hr class="title">`+getTrad('perks.'+perk+'.desc')+
											(infoPerk !== false ? '<br><i>'+infoPerk+'</i>' : '')+`
										</div>
										<div class="recapPerkModel">`+imgModel.join('')+`</div>
									</li>`;
					listPerkModel.push(textPerk);
				}else{
					let textPerk = `<li>
										<div class="`+imgPerkClass.join(' ')+`"><img src="`+perkPict+`"></div>
										<div class="recapText">
											`+namePerk+`<hr class="title">`+getTrad('perks.'+perk+'.desc')+
											(infoPerk !== false ? '<br><i>'+infoPerk+'</i>' : '')+`
										</div>
									</li>`;
					listPerk.push(textPerk);
				}
			}
			block.push('<ul class="recapList">'+listPerkModel.join('')+listPerk.join('')+'</ul>');
			blocks.push(block.join(''));

		let textToDisplay = blocks.join('<hr>');

		getId('contentstats').innerHTML = textToDisplay;
		renderStuff();
	}
	function optionPage(){
		let player = getCharacter('player');
		let from = getStorage('currentPage');
		showPage(from,'main-options');

		//Give the Participants Data
		function dataParticipants(charId){
			let data = window.database.participants[charId];
			let info = [];
			let face;
			let errors = [];
			info.push('<u>'+getTrad('optionmenu.checkdata.name')+'</u> '+data.name);
			info.push('<u>'+getTrad('optionmenu.checkdata.haircolor')+'</u> '+getTrad('basic.color.'+data.hairColor));
			info.push('<u>'+getTrad('optionmenu.checkdata.typebody')+'</u> '+data.typeBody);
			info.push('<u>'+getTrad('optionmenu.checkdata.sizeboobs')+'</u> '+data.sizeBoobs);
			info.push('<u>'+getTrad('optionmenu.checkdata.agerange')+'</u> '+data.ageRange.join('-'));

			//Check Faces
				if(data.picts === undefined||Object.keys(data.picts).length != 7){
					info.push('<u>'+getTrad('optionmenu.checkdata.faces')+'</u> <span class="badThing">Error</span>');
					errors.push('No Faces');
				}else{
					info.push('<u>'+getTrad('optionmenu.checkdata.faces')+'</u> <span class="goodThing">Ok</span>');
				}
				if(data.picts !== undefined && data.picts.base !== undefined)
					face = data.picts.base;

			//Check Hypno Pictures
				if(data.hypnoPicts === undefined||data.hypnoPicts.length == 0){
					info.push('<u>'+getTrad('optionmenu.checkdata.hypnopicts')+'</u> <span class="badThing">No Pics</span>');
					errors.push('No Hypno Pictures');
				}else{
					info.push('<u>'+getTrad('optionmenu.checkdata.hypnopicts')+'</u> <span class="goodThing">'+data.hypnoPicts.length+'</span>');
				}

			//Check Perks
				let perks = [];
				if(data.perks !== undefined && data.perks.length > 0){
					for(let perkId of data.perks){
						perks.push(getTrad('perks.'+perkId+'.name'));
					}
				}
				if(perks.length == 0){
					info.push('<u>'+getTrad('optionmenu.checkdata.perks')+'</u> <span class="badThing">None</span>');
					errors.push('No Perks');
				}else{
					info.push('<u>'+getTrad('optionmenu.checkdata.perks')+'</u> <span class="goodThing">'+perks.join(' / ')+'</span>');
				}

			//Check Album
				let nbAlbumType = 0;
				let nbAlbumPics = 0;
				if(data.album !== undefined){
					for(let elemId in data.album){
						if(data.album[elemId].length > 0){
							nbAlbumType++;
							nbAlbumPics += data.album[elemId].length;
						}
					}
				}
				if(nbAlbumType == 0){
					info.push('<u>'+getTrad('optionmenu.checkdata.albumtypes')+'</u> <span class="badThing">0</span>');
					errors.push('No Album Type');
				}else{
					info.push('<u>'+getTrad('optionmenu.checkdata.albumtypes')+'</u> <span class="goodThing">'+nbAlbumType+'</span>');
				}
				if(nbAlbumPics == 0){
					info.push('<u>'+getTrad('optionmenu.checkdata.albumpics')+'</u> <span class="badThing">0</span>');
					errors.push('No Album Pictures');
				}else{
					info.push('<u>'+getTrad('optionmenu.checkdata.albumpics')+'</u> <span class="goodThing">'+nbAlbumPics+'</span>');
				}

			//Check Cams Pictures
				let camsPhoto = 0;
				if(data.camsPhoto !== undefined && Object.keys(data.camsPhoto).length > 0){
					for(let elemId in data.camsPhoto){
						if(Object.keys(data.camsPhoto[elemId]).length == 5)
							camsPhoto++;
					}
				}
				if(camsPhoto == 0){
					info.push('<u>'+getTrad('optionmenu.checkdata.camsphoto')+'</u> <span class="badThing">None</span>');
					errors.push('No Strips Pictures');
				}else{
					info.push('<u>'+getTrad('optionmenu.checkdata.camsphoto')+'</u> <span class="goodThing">'+camsPhoto+'</span>');
				}
			
			//Check Profiles Pictures
				let profilePicts = 0;
				if(data.profilePicts !== undefined && Object.keys(data.profilePicts).length > 0){
					for(let elemId in data.profilePicts){
						if(data.profilePicts[elemId].length == 6)
							profilePicts++;
					}
				}
				if(profilePicts == 0){
					info.push('<u>'+getTrad('optionmenu.checkdata.profilepicts')+'</u> <span class="badThing">None</span>');
					errors.push('No Profiles Pictures');
				}else{
					info.push('<u>'+getTrad('optionmenu.checkdata.profilepicts')+'</u> <span class="goodThing">'+profilePicts+'</span>');
				}

			//Check inHallWay Pictures
				let inHallway = 0;
				if(data.inHallway !== undefined && Object.keys(data.inHallway).length > 0){
					for(let elemId in data.inHallway){
						if(Object.keys(data.inHallway[elemId]).length >= 2)
							inHallway++;
					}
				}
				if(inHallway == 0){
					info.push('<u>'+getTrad('optionmenu.checkdata.inhallway')+'</u> <span class="badThing">None</span>');
					errors.push('No inHallWay Pictures');
				}else{
					info.push('<u>'+getTrad('optionmenu.checkdata.inhallway')+'</u> <span class="goodThing">'+inHallway+'</span>');
				}
			
			//Check Activities
				info.push('<b><u>'+getTrad('optionmenu.checkdata.activities')+'</u></b>');
				for(let locaId in window.database.locations){
					for(let activityId in window.database.locations[locaId].activities){
						let setDisp = 0;
						if(data.activities !== undefined && data.activities[activityId] !== undefined && Object.keys(data.activities[activityId]).length > 0){
							for(let setId in data.activities[activityId]){
								if(data.activities[activityId][setId].length == 5)
									setDisp++;
							}
						}
						if(setDisp == 0){
							info.push('<u>'+activityId+'</u> <span class="badThing">Missing</span>');
							errors.push('Activity '+activityId+': Missing');
						}else{
							info.push('<u>'+activityId+'</u> <span class="goodThing">'+setDisp+'</span>');
						}
					}
				}
			
			return {"face":face,"info":info,"errors":errors};
		}

		//Give the Dreams Data
		function dataDreams(charId){
			let data = window.database.morning.dreams[charId];
			let info = [];
			let errors = [];
			//Conditions
				if(data.conditions !== undefined && Object.keys(data.conditions).length > 0){
					for(let id in data.conditions){
						let condition = data.conditions[id];
						if(condition.wasMan !== undefined){
							if(condition.wasMan)
								info.push('Need to start as a Man');
							else
								info.push('Need to start as a Woman');
						}else if(condition.hadDreamOne !== undefined){
							let line = [];
							for(let key of condition.hadDreamOne){
								line.push(getTrad('morning.dreams.'+key+'.title'));
							}
							info.push('Need to already have dream one of them: '+line.join(' / '));
						}else if(condition.hadDreamAll !== undefined){
							let line = [];
							for(let key of condition.hadDreamAll){
								line.push(getTrad('morning.dreams.'+key+'.title'));
							}
							info.push('Need to already have dream all of them: '+line.join(' / '));
						}else if(condition.notHadDreamOne !== undefined){
							let line = [];
							for(let key of condition.notHadDreamOne){
								line.push(getTrad('morning.dreams.'+key+'.title'));
							}
							info.push('<u>Must not have those Dreams:</u> '+line.join(' / '));
						}else if(condition.version !== undefined){
							info.push('Need a new game with the '+condition.version+' version');
						}else if(condition.items !== undefined){
							let line = [];
							for(let itemId in condition.items){
								line.push(itemId+' with at lvl:'+condition.items[itemId].join(','));
							}
							info.push('<u>Need those items:</u> '+line.join(' / '));
						}else if(condition.havePerks !== undefined){
							let line = [];
							for(let key of condition.havePerks){
								line.push(getTrad('perks.'+key+'.name'));
							}
							info.push('<u>Must have all those perks:</u> '+line.join(' / '));
						}else if(condition.havePerksOne !== undefined){
							let line = [];
							for(let key of condition.havePerksOne){
								line.push(getTrad('perks.'+key+'.name'));
							}
							info.push('<u>Must have at least one of those perks:</u> '+line.join(' / '));
						}else if(condition.notHavePerks !== undefined){
							let line = [];
							for(let key of condition.notHavePerks){
								line.push(getTrad('perks.'+key+'.name'));
							}
							info.push('<u>Must not have those perks:</u> '+line.join(' / '));
						}else if(condition.hadEventOne !== undefined){
							let line = [];
							for(let key of condition.hadEventOne){
								line.push(getTrad('events.'+key+'.name'));
							}
							info.push('Need to already have one of those Events: '+line.join(' / '));
						}else if(condition.key !== undefined){
							let typeName = '';
							switch(condition.key){
								case 'bimbo':typeName = 'bimbo lvl';break;
								case 'slut':typeName = 'slut lvl';break;
								case 'dayNumber':typeName = 'Number of Days';break;
								case 'gender':typeName = getTrad('basic.gender.'+condition.value);break;
								default:typeName = ucfirst(condition.key);break;
							}

							if(condition.value !== undefined){
								info.push('Need to be a '+typeName);
							}else if(condition.range !== undefined){
								info.push('Need to have a '+typeName+' between '+condition.range.join('-'));
							}else if(condition.more !== undefined){
								info.push('Need to have a '+typeName+' more than '+condition.more);
							}
						}

					}
				}
			
			//Other
				if(data.repeatable !== undefined && data.repeatable)
					info.push('Is repeatable');

			return {"info":info,"errors":errors};
		}

		//Load language
			let languageSelect = getId('language-choose');
			if(languageSelect !== undefined && languageSelect !== null){
				languageSelect.innerHTML = '';
				let languagesList = Object.keys(window.translation);
				for(let i=0;i<languagesList.length;i++){
					let newOption = document.createElement('option');
					let optionText = document.createTextNode(languagesList[i].toUpperCase());
					newOption.appendChild(optionText);
					newOption.setAttribute('value',languagesList[i]);

					if(languagesList[i] == language)
						newOption.setAttribute('selected','selected');

					languageSelect.appendChild(newOption);
				}
				languageSelect.onchange = function(e) {
					let opts = languageSelect.options;
					let value = opts[opts.selectedIndex].getAttribute('value');
					language = value;
					setting('language',value);
					showPage('main-options',from);
					location.reload();
					return false;
				};
			}

		//Checkable
			let elementsOptionCheckable = [
				'darkmode',
				'showlogo',
				'highlightchange',
				'progressnumber',
				'perksinfluence',
				'currentinfluence',
				'corruptpoint',
				'clueaction',
				'showpoints',
				'fanfeature',
				'pickupobject',
				'profileperks',
			];
			for(let elem of elementsOptionCheckable){
				let elemId = 'mainOption-'+elem;
				let element = getId(elemId);

				if(element !== null){
					let settingVal = setting(elem);
					if(settingVal|| (['darkmode','showlogo','showpoints','fanfeature'].indexOf(elem) !== -1 && settingVal === undefined)){	//Checked by default
						addClass(element,'icon-toggleOnR');
						removeClass(element,'icon-toggleOffR');
					}else{
						removeClass(element,'icon-toggleOnR');
						addClass(element,'icon-toggleOffR');
					}

					element.onclick = function() {
						toggleClass(this,'icon-toggleOffR');
						toggleClass(this,'icon-toggleOnR');
						setting(elem,haveClass(this,'icon-toggleOnR'));
						if(elem == 'darkmode'){
							toggleClass(document.getElementsByTagName('body')[0],'darkmode');
						}else if(elem == 'showlogo'){
							manageShowLogo();
						}else if(elem == 'fanfeature'){
							manageFans();
						}
						if(getStorage('characters') !== false){
							retrieveSidebar();
						}
						return false;
					};

					if(window.database.difficultyClassic[elem] !== undefined){
						if(getStorage('difficulty') == 'classic'){
							element.closest('li').setAttribute('disabled','disabled');
							element.onclick = null;
						}else{
							element.closest('li').removeAttribute('disabled');
						}
					}
				}
			}

		//Choices
			let elementsOptionChoice = [
				'defeatedhousemate',
				'activitydisplay',
				'sizepicture',
				'speedvideo',
				'memory',
				'trapssystem',
				'crazyworld',				
			];
			for(let elem of elementsOptionChoice){
				let elemClass = 'mainOption-'+elem;
				let elements = getId('main-options').querySelectorAll('.'+elemClass);
				let currentValue = setting(elem);

				if(currentValue === undefined){
					let valueDefault = getId('main-options').querySelector('.'+elemClass+'.selected').getAttribute('data-value');
					getId(elem+'Desc').innerHTML = getTrad('optionmenu.'+elem+'.'+valueDefault.replace('.','')+'desc');
				}else{
					getId(elem+'Desc').innerHTML = getTrad('optionmenu.'+elem+'.'+currentValue.replace('.','')+'desc');
				}

				elements.forEach(function(element){
					if(currentValue){
						removeClass(element,'selected');
						let elemValue = element.getAttribute('data-value');
						if(elemValue == currentValue){
							addClass(element,'selected');
						}
					}

					element.onclick = function() {
						let newValue = this.getAttribute('data-value');
						let saves = getStorage('saves');
						if(saves !== false && elem == 'memory' && newValue == 'sessionstorage'){
							if(!confirm(getTrad('optionmenu.memory.sessionwarningsave')))
								return false;
						}

						removeClass(getId('main-options').querySelector('.'+elemClass+'.selected'),'selected');
						addClass(this,'selected');
						setting(elem,newValue);
						getId(elem+'Desc').innerHTML = getTrad('optionmenu.'+elem+'.'+newValue.replace('.','')+'desc');
						if(elem == 'sizepicture'){
							manageSizePicture();
						}else if(elem == 'speedvideo'){
							renderStuff();
						}else if(elem == 'memory'){
							if(newValue == 'sessionstorage'){
								deleteStorage('saves');
								for(let key in window.localStorage){
									if(key.indexOf('insertStory_') == 0|| key == 'popupStart'){
										sessionStorage.setItem(key,window.localStorage.getItem(key));
										window.localStorage.removeItem(key);
									}
								}
								addClass(getId('createLocalSave'),'hide');
							}else{
								for(let key in sessionStorage){
									if(key.indexOf('insertStory_') == 0){
										window.localStorage.setItem(key,sessionStorage.getItem(key));
									}
								}
								sessionStorage.clear();
								removeClass(getId('createLocalSave'),'hide');
							}
						}
						if(getStorage('characters') !== false){
							retrieveSidebar();
						}
						return false;
					};

					//Surdef of options
					if(window.database.difficultyClassic[elem] !== undefined){
						if(getStorage('difficulty') == 'classic'){
							element.closest('li').setAttribute('disabled','disabled');
							element.onclick = null;
						}else if(elem == 'defeatedhousemate' && player !== false && player.mod !== undefined && player.mod.endless){
							element.closest('li').setAttribute('disabled','disabled');
							element.onclick = null;
						}else{
							element.closest('li').removeAttribute('disabled');
						}
					}
				});
			}

		//Reset
			getId('mainOption-resetAll').onclick = function() {
				if(confirm(getTrad('optionmenu.resetallconfirm'))){
					showPage('main-options','main-menu');
					clearStorage();
					location.reload();
				}
				return false;
			};
			getId('mainOption-resetGame').onclick = function() {
				if(confirm(getTrad('optionmenu.resetgameconfirm'))){
					showPage('main-options','main-menu');
					cleanStorage('all');	//So all but not saves
					location.reload();
				}
				return false;
			};

		activatePageTabs('main-options');

		//GamePlay Elements
		function loadSelectElements(type){
			let listElement = getId('list'+ucfirst(type));

			let isSet = listElement.getAttribute('data-isSet');
			let path = listElement.getAttribute('data-path');
			if(path === null)
				path = type;
			let optionFeature = listElement.getAttribute('data-feature');
			if(optionFeature === null)
				optionFeature = 'Disabled';
			let subPath = listElement.getAttribute('data-subpath');
			let subtype = listElement.getAttribute('data-subtype');
			if(subtype === null)
				subtype = 'key';

			let elementsDisabled = setting(type+optionFeature);
			if(elementsDisabled === undefined){
				if(optionFeature == 'Disabled')
					elementsDisabled = [];
				else
					elementsDisabled = {};
			}
			let elementToShow = [];
			let listOfType = {};

			let elementData = clone(gObj(window.database,path));
			if(subPath !== null){
				let tmp = {};
				for(let key in elementData){
					if(subtype == 'value'){
						for(let idvid in elementData[key][subPath]){
							let value = elementData[key][subPath][idvid];
							tmp[value] = ucfirst(key)+' '+(parseInt(idvid)+1);
						}
					}else{
						//Todo
					}
				}
				elementData = tmp;
			}

			if(isSet !== null){
				let tmpData = {};
				for(let typeId in elementData){
					if(typeId == 'man')
						continue;

					listOfType[typeId] = 0;

					for(let setId in elementData[typeId]){
						let key = typeId+'_'+setId;
						tmpData[key] = elementData[typeId][setId];
						tmpData[key].typeSet = typeId;
						listOfType[typeId]++;
					}
				}
				elementData = tmpData;
			}

			//Display Info
			if(Object.keys(listOfType).length > 0 && getId('info'+ucfirst(type)) !== null){
				getId('info'+ucfirst(type)).innerHTML = '';
				let tmpData = [];
				for(let id in listOfType){
					if(listOfType[id] <= 0)
						continue;
					tmpData.push(id+': '+listOfType[id]);
				}
				getId('info'+ucfirst(type)).innerHTML = tmpData.join(' / ');
			}

			for(let dataId in elementData){
				let data = elementData[dataId];
				let name = dataId;
				switch(type){
					case 'participants':
						name = data.name;
						break;
					case 'events':
						name = getTrad('events.'+dataId+'.name');
						break;
					case 'hypno':
						name = data;
						break;
					default:
						let testTrad = getTrad(path+'.'+dataId+'.title');
						if(testTrad != path+'.'+dataId+'.title')
							name = testTrad;
						break;
				}

				let addLineContent = '';
				let additionnalPart = '';
				if(type == 'participants'){
					let infoData = dataParticipants(dataId);
					if(infoData.errors.length > 0)
						addLineContent = ' <span class="pointerInfo icon icon-danger2R" title="Errors:&#013;-'+infoData.errors.join('&#013;-')+'"></span>';
					additionnalPart = '<li class="detailOptions hide" data-id="'+dataId+'">'+
											(infoData.face !== undefined ? imgVideo(infoData.face) : '')+
											'<ul><li>'+infoData.info.join('</li><li>')+'</li></ul>'+
										'</li>';
				}else if(type == 'dreams'){
					let infoData = dataDreams(dataId);
					if(infoData.info.length > 0)
						additionnalPart = '<li class="detailOptions hide" data-id="'+dataId+'"><ul><li>'+infoData.info.join('</li><li>')+'</li></ul></li>';
				}else if(['clothtop','clothbottom'].indexOf(type) !== -1){
					let listOption = [];
					for(let typeId in listOfType){
						if(elementsDisabled[dataId] !== undefined && elementsDisabled[dataId] == typeId)
							listOption.push('<option selected="selected" value="'+typeId+'">'+typeId+'</option>');
						else if((elementsDisabled[dataId] === undefined || elementsDisabled[dataId] == '') &&  dataId.indexOf(typeId) !== -1)
							listOption.push('<option selected="selected" value="'+typeId+'">'+typeId+'</option>');
						else
							listOption.push('<option value="'+typeId+'">'+typeId+'</option>');
					}
					addLineContent = '<br><img src="'+data.display[0]+'">'+'<select data-id="'+dataId+'" data-type="'+type+'" class="chooseOption">'+listOption.join('')+'</select>';
				}else if(type == 'events'){
					let infoEvent = window.database.events[dataId];
					let testTrad = getTrad(path+'.'+dataId+'.desc');
					if(testTrad !== path+'.'+dataId+'.desc')
						addLineContent = '<br><i>'+getTrad(path+'.'+dataId+'.desc')+'</i>';
					let chanceDisplay = [];
					if(infoEvent.chance !== undefined){
						for(let diffId in infoEvent.chance){
							chanceDisplay.push(getTrad('newgame.difficulty.'+diffId)+': '+infoEvent.chance[diffId]+'%');
						}
						addLineContent += '<br><i style="font-size:0.5em;">'+chanceDisplay.join(' / ')+'</i>';
					}
				}else if(type == 'hypno'){
					addLineContent = '<button class="btn btn-info popupShowMedia" data-media="'+dataId+'"><span class="icon icon-glass"></span></button>';
				}else{
					let testTrad = getTrad(path+'.'+dataId+'.desc');
					if(testTrad !== path+'.'+dataId+'.desc')
						addLineContent = '<br><i>'+getTrad(path+'.'+dataId+'.desc')+'</i>';
				}

				let isOff = false;
				if(optionFeature == 'Disabled' && elementsDisabled.indexOf(dataId) != -1)
					isOff = true;
				else if(elementsDisabled[dataId] !== undefined && elementsDisabled[dataId] === '')
					isOff = true;

				if(isOff){
					elementToShow.push('<li class="elemOptions" data-id="'+dataId+'">'+name+'<span class="icon icon-toggleOffR optionAction" data-id="'+dataId+'" data-type="'+type+'"></span>'+addLineContent+'</li>');
				}else{
					elementToShow.push('<li class="elemOptions" data-id="'+dataId+'">'+name+'<span class="icon icon-toggleOnR optionAction" data-id="'+dataId+'" data-type="'+type+'"></span>'+addLineContent+'</li>');
				}

				if(additionnalPart !== '')
					elementToShow.push(additionnalPart);
			}

			listElement.innerHTML = '';
			if(elementToShow.length > 0){
				listElement.innerHTML = elementToShow.join('');
			}
			controlSelectElements(type);
		}
		loadSelectElements('events');
		loadSelectElements('participants');
		loadSelectElements('clothtop');
		loadSelectElements('clothbottom');
		loadSelectElements('dreams');
		loadSelectElements('hypno');

		//Bars
		let bars = document.getElementsByClassName('bar-border');
		for(let i=0;i < bars.length;i++){
			
			let currSettingBar = setting(bars[i].id);
			if(currSettingBar === undefined){
				let valReset = bars[i].parentNode.getAttribute('data-path');
				currSettingBar = gObj(clone(window.database),valReset)+'%';
			}
			let elemBar = bars[i].firstElementChild;
			elemBar.style.width = currSettingBar;
			elemBar.innerHTML = currSettingBar;

			bars[i].onmousedown = function(ev) {
				isMousedown = true;
				changeBarValue(ev);
			}
			bars[i].onmouseup = function(ev) {
				isMousedown = false;
				let elem = ev.target.closest('.bar-border');
				let value = elem.getElementsByClassName('bar-content')[0].innerHTML;
				setting(elem.id,value);

				//Reset the dream happening
				if(elem.id == 'dreamsProba'){
					deleteStorage('probaDream');
				}
			}
			bars[i].onmouseleave = function(ev) {
				isMousedown = false;
			}
			bars[i].addEventListener('mousemove', moveBarValue);

			//Btn 0, 100 or reset
			let divParent = bars[i].parentNode;
			let btnControl = divParent.querySelectorAll('.bar-control');
			for(let btn of btnControl){
				btn.onclick = function(ev) {
					let parent = this.parentNode;
					let value = this.getAttribute('data-value');
					if(value == 'reset'){
						let valReset = parent.getAttribute('data-path');
						value = gObj(clone(window.database),valReset);
					}
					value+='%';
					let barHere = parent.querySelector('.bar-border');
					let barSub = barHere.querySelector('.bar-content');
					barSub.style.width = value;
					barSub.innerHTML = value;
					setting(barHere.id,value);

					//Reset the dream happening
					if(barHere.id == 'dreamsProba'){
						deleteStorage('probaDream');
					}
				};
			}

			if(getStorage('difficulty') == 'classic'){
				bars[i].closest('.barContainer').setAttribute('disabled','disabled');
				bars[i].onmousedown = null;
				bars[i].onmouseup = null;
				bars[i].onmouseleave = null;
			}else{
				bars[i].closest('.barContainer').removeAttribute('disabled');
			}
		}

		//Btn Elems
		function controlSelectElements(type){
			//Try to Turn Off and On again
			let btnOptionElemsList = getId('main-options').querySelectorAll('#list'+ucfirst(type)+' li span.icon.optionAction');
			btnOptionElemsList.forEach(function(element){
				element.onclick = function(e) {
					let elemId = this.getAttribute('data-id');
					let typeId = this.getAttribute('data-type');
					let optionFeature = getId('list'+ucfirst(type)).getAttribute('data-feature');
					if(optionFeature === null)
						optionFeature = 'Disabled';

					if(elemId !== null){
						let elementsDisabled = setting(typeId+optionFeature);
						if(optionFeature == 'Disabled'){
							if(elementsDisabled === undefined)
								elementsDisabled = [];
							let find = elementsDisabled.indexOf(elemId);
							if(find != -1){
								elementsDisabled.splice(find,1);
								addClass(this,'icon-toggleOffR');
								removeClass(this,'icon-toggleOnR');
							}else{
								elementsDisabled.push(elemId);
								removeClass(this,'icon-toggleOffR');
								addClass(this,'icon-toggleOnR');
							}
						}else{
							if(elementsDisabled === undefined)
								elementsDisabled = {};
							let find = elementsDisabled[elemId];
							if(find == ''){
								delete elementsDisabled[elemId];
								addClass(this,'icon-toggleOffR');
								removeClass(this,'icon-toggleOnR');
							}else{
								elementsDisabled[elemId] = '';
								removeClass(this,'icon-toggleOffR');
								addClass(this,'icon-toggleOnR');
							}
						}
						
						setting(typeId+optionFeature,elementsDisabled);
						loadSelectElements(typeId);
					}
				};
			});

			//Manage the selects
			let selectOptionElemsList = getId('main-options').querySelectorAll('#list'+ucfirst(type)+' li select');
			selectOptionElemsList.forEach(function(element){
				element.onchange = function(e) {
					let elemId = this.getAttribute('data-id');
					let typeId = this.getAttribute('data-type');
					let optionFeature = getId('list'+ucfirst(type)).getAttribute('data-feature');
					if(optionFeature === null)
						optionFeature = 'Choose';

					if(elemId !== null){
						let elementsDisabled = setting(typeId+optionFeature);
						if(elementsDisabled === undefined)
							elementsDisabled = {};
						elementsDisabled[elemId] = this.value;
						removeClass(this,'icon-toggleOffR');
						addClass(this,'icon-toggleOnR');
						
						setting(typeId+optionFeature,elementsDisabled);
						loadSelectElements(typeId);
					}
				};
			});

			//Show/Hide the additionnal line
			let elemOptionsList = getId('main-options').querySelectorAll('#list'+ucfirst(type)+' li.elemOptions');
			elemOptionsList.forEach(function(element){
				let dataId = element.getAttribute('data-id');
				let findLiLinked = getId('main-options').querySelector('#list'+ucfirst(type)+' li.detailOptions[data-id="'+dataId+'"]');
				if(findLiLinked !== null){
					element.onclick = function(e) {
						toggleClass(findLiLinked,'hide');
					};
				}
			});
			let detailOptionsList = getId('main-options').querySelectorAll('#list'+ucfirst(type)+' li.detailOptions');
			detailOptionsList.forEach(function(element){
				element.onclick = function(e) {
					toggleClass(this,'hide');
				};
			});

			//PopupMedia
			let btnPopupShowMedia = getId('main-options').querySelectorAll('#list'+ucfirst(type)+' .popupShowMedia');
			btnPopupShowMedia.forEach(function(element){
				element.onclick = function(e) {
					let media = this.getAttribute('data-media');
					let textPopup = '<div class="centerContent">'+imgVideo(media)+'</div>';
					showPopup(textPopup,'centeredPopup');
				}
			});

			//Img Cloth
			if(['clothbottom','clothtop'].indexOf(type) !== -1){
				let btnPopupShowImg = getId('main-options').querySelectorAll('#list'+ucfirst(type)+' img');
				btnPopupShowImg.forEach(function(element){
					element.onclick = function(e) {
						let imgs = [];
						let info = this.parentNode.querySelector('select');
						let tmp = info.getAttribute('data-id').split('_');
						let type = ( info.getAttribute('data-type') == 'clothbottom' ? 'bottomCloth' : 'topCloth');
						let kind = tmp[0];
						let id = tmp[1];
						let listImg = window.database.cloth[type][kind][id].display;
						for(let src of listImg){
							imgs.push(imgVideo(src));
						}
						let textPopup = '<div class="centerContent">'+imgs.join('')+'</div>';
						showPopup(textPopup,'centeredPopup');
					}
				});
			}
		}

		//Cheats
			if(getStorage('difficulty') == 'classic'){		//No cheat on classic
				addClass(getId('main-options').querySelector('div.trad[data-target="optionCheats"]'),'hide');
			}else{
				removeClass(getId('main-options').querySelector('div.trad[data-target="optionCheats"]'),'hide');
				for(let cheat of getId('cheats').querySelectorAll('li')){
					cheat.onclick = function(){
						let cheatId = this.getAttribute('data-id');
						let list;
						let html;
						let player = getCharacter('player');
						switch(cheatId){
							case 'votes':
								player.votes += getPrice();
								player.save();
								showPopup(getTrad('optionmenu.optioncheatsactivated'),'div-success',2000);
								break;
							case 'traps':
								let actions = window.database.actions;
								let locaAction = {};
								for(let id in actions){
									let action = actions[id];
									if(locaAction[action.activity] === undefined)
										locaAction[action.activity] = [];
									locaAction[action.activity].push(id);
								}
								let villa = getStorage('villa');
								for(let loca in villa.locations){
									for(let actiId in villa.locations[loca].activities){
										if(locaAction[actiId] !== undefined){
											for(let actionId of locaAction[actiId]){
												villa.locations[loca].activities[actiId].trap.push(actionId);
											}
										}
									}
								}
								for(let loca in villa.bedrooms){
									for(let actiId in villa.bedrooms[loca].activities){
										if(locaAction[actiId] !== undefined){
											for(let actionId of locaAction[actiId]){
												villa.bedrooms[loca].activities[actiId].trap.push(actionId);
											}
										}
									}
								}
								setStorage('villa',villa);
								showPopup(getTrad('optionmenu.optioncheatsactivation.'+cheatId),'div-success',2000);
								break;
							case 'transform':
								list = archetypeDispo();
								if(list.length > 0){
									let options = ['<option value="">'+getTrad('optionmenu.optioncheatschoose')+'</option>'];
									for(let id of list){
										options.push('<option value="'+id+'">'+window.database.participants[id].name+'</option>');
									}
									html = '<select id="selectCheat" data-id="'+cheatId+'">'+options.join('')+'</select>';
									showPopup(html);
									getId('popup').onclick = null;
								}
								break;
							case 'events':
								let eventsDisabled = setting('eventsDisabled');
								if(eventsDisabled === undefined)
									eventsDisabled = [];
								list = Object.keys(window.database.events);
								list = arrayDiff(list,eventsDisabled);
								if(list.length > 0){
									let options = ['<option value="">'+getTrad('optionmenu.optioncheatschoose')+'</option>'];
									for(let id of list){
										let infoEvent = window.database.events[id];
										if(infoEvent.when === undefined||infoEvent.when.length == 0)	//No Shuffle now
											continue;
										if(infoEvent.when.indexOf('pickOtherStuff') !== -1)				//No Accounting files
											continue;
										if(infoEvent.cantCheat !== undefined && infoEvent.cantCheat)	//Some stuff is out limit
											continue;
										options.push('<option value="'+id+'">'+getTrad('events.'+id+'.name')+'</option>');
									}
									html = '<select id="selectCheat" data-id="'+cheatId+'">'+options.join('')+'</select>';
									showPopup(html);
									getId('popup').onclick = null;
								}
								break;
							case 'dreams':
								let dreamsDisabled = setting('dreamsDisabled');
								if(dreamsDisabled === undefined)
									dreamsDisabled = [];
								list = Object.keys(window.database.morning.dreams);
								list = arrayDiff(list,dreamsDisabled);
								if(list.length > 0){
									let options = ['<option value="">'+getTrad('optionmenu.optioncheatschoose')+'</option>'];
									for(let id of list){
										options.push('<option value="'+id+'">'+getTrad('morning.dreams.'+id+'.title')+'</option>');
									}
									html = '<select id="selectCheat" data-id="'+cheatId+'">'+options.join('')+'</select>';
									showPopup(html);
									getId('popup').onclick = null;
								}
								break;
							case 'schedule':
								defineSchedule();
								setStorage('trapUsed',[]);
								showPopup(getTrad('optionmenu.optioncheatsactivation.'+cheatId),'div-success',2000);
								retrieveContent();
								break;
							case 'stats':
								html = '<div class="popupDisplay">'+
												'<div id="cheatsBimbo" class="smallDiv">'+
													'<div class="smallDescPict"><img src="data/img/other/cheats/cheats-bimbo.jpg"></div>'+
													'<div class="smallDescName">'+getTrad('optionmenu.optioncheatsstats.bimbo')+'</div>'+
												'</div>'+
												'<div id="cheatsSlut" class="smallDiv">'+
													'<div class="smallDescPict"><img src="data/img/other/cheats/cheats-slut.jpg"></div>'+
													'<div class="smallDescName">'+getTrad('optionmenu.optioncheatsstats.slut')+'</div>'+
												'</div>'+
											'</div>'+
											'<div id="popupCancel" class="btn"><span class="icon icon-goback"></span>'+ucfirst(getTrad('basic.cancel'))+'</div>';

								showPopup(html);
								getId('popup').onclick = null;

								getId('cheatsBimbo').onclick = function(e){
									e.stopPropagation();
									let player = getCharacter('player');
									player.bimbo += 5;
									player.save();
									retrieveSidebar();
									showPopup(getTrad('optionmenu.optioncheatsactivation.stats',{'statname':getTrad('optionmenu.optioncheatsstats.bimbo'),'statvalue':player.get('bimbo')}),'div-success',2000);
								}

								getId('cheatsSlut').onclick = function(e){
									e.stopPropagation();
									let player = getCharacter('player');
									player.slut += 5;
									player.save();
									retrieveSidebar();
									showPopup(getTrad('optionmenu.optioncheatsactivation.stats',{'statname':getTrad('optionmenu.optioncheatsstats.slut'),'statvalue':player.get('slut')}),'div-success',2000);
								}
								break;
							case 'perks':
								let perksHave = [];
								if(player.perks !== undefined && player.perks.length > 0){
									for(let perkId of player.perks){
										perksHave.push(getTrad('perks.'+perkId+'.name'));
									}
								}
								html = getTrad('optionmenu.optioncheatsperkshave')+':<br><small>'+getTrad('optionmenu.optioncheatsperkshavedesc')+'</small><br><ul>';
								if(perksHave.length > 0){
									html += '<li>'+perksHave.join('</li><li>')+'</li>';
								}else{
									html += '<li>'+getTrad('basic.none')+'</li>';
								}
								html += '</ul><br>';
								list = Object.keys(window.database.perks).sort();
								if(list.length > 0){
									let options = ['<option value="">'+getTrad('optionmenu.optioncheatschoose')+'</option>'];
									for(let id of list){
										options.push('<option value="'+id+'">'+getTrad('perks.'+id+'.name')+'</option>');
									}
									html += '<select id="selectCheat" data-id="'+cheatId+'">'+options.join('')+'</select>';
									html += '<br><div id="popupCancel" class="btn"><span class="icon icon-goback"></span>'+ucfirst(getTrad('basic.cancel'))+'</div>';
									showPopup(html);
									getId('popup').onclick = null;
								}
								break;
						}

						//Popup
							let selectCheat = getId('selectCheat');
							if(selectCheat !== null){
								selectCheat.onchange = function(){
									let value = selectCheat.value;
									if(value != ''){
										let cheatId = selectCheat.getAttribute('data-id');
										switch(cheatId){
											case 'transform':
												player = getCharacter('player');
												player.changeFace(value);
												showPopup(getTrad('optionmenu.optioncheatsactivation.'+cheatId),'div-success',2000);
												break;
											case 'events':
												setStorage('nextEvents',value);
												showPopup(getTrad('optionmenu.optioncheatsactivated'),'div-success',2000);
												break;
											case 'dreams':
												setStorage('nextDream',value);
												showPopup(getTrad('optionmenu.optioncheatsactivated'),'div-success',2000);
												break;
											case 'perks':
												player = getCharacter('player');
												if(player.havePerk(value))
													player.addPerks(['-'+value]);
												else
													player.addPerks([value]);
												showPopup(getTrad('optionmenu.optioncheatsactivated'),'div-success',2000);
												break;
										}
										retrieveSidebar();
									}
								}
							}

							let popupCancel = getId('popupCancel');
							if(popupCancel !== null){
								popupCancel.onclick = function(){
									getId('popup').innerHTML = '';
									addClass(getId('popup'),'hide');
								}
							}

						player = getCharacter('player');
						if(player.stats.cheats === undefined){
							player.stats.cheats = {};
							player.stats.cheatsCurrent = {};
						}
						if(player.stats.cheats[cheatId] === undefined){
							player.stats.cheats[cheatId] = 0;
							player.stats.cheatsCurrent[cheatId] = 0;
						}
						player.stats.cheats[cheatId]++;
						player.stats.cheatsCurrent[cheatId]++;
						player.stats.dayWithoutCheating = 0;
						player.save();

						retrieveSidebar();
					}
				}
			}

		//Show Alerts
			if(getStorage('difficulty') == 'classic'){
				removeClass(getId('classicModAlert'),'hide');
			}else{
				addClass(getId('classicModAlert'),'hide');
			}

			if(player !== false && player.mod !== undefined && player.mod.endless){
				removeClass(getId('endlessModAlert'),'hide');
			}else{
				addClass(getId('endlessModAlert'),'hide');
			}

		//Content Stats Fill up
		setObserver('optionStats','class','giveContentStats');

		if(!haveClass(getId('optionStats'),'hide')){
			giveContentStats();
		}
	}
	function profilePage(){

		let listProfils = getAllProfiles();
		let divShow = getId('listOfProfile');
		if(Object.keys(listProfils).length > 0){
			let htmlContent = '';
			let currentProfile = getProfileId();
			for(let profilId in listProfils){
				let profil = listProfils[profilId];

				let addClass = ['profilDisplay'];
				if(currentProfile == profilId)
					addClass.push('current');

				htmlContent += '<div class="'+addClass.join(' ')+'" data-id="'+profil.id+'"><b>'+profil.name+'</b> / <u>'+getTrad('profileManagement.created')+': '+profil.created_at+'</u> / <u>'+getTrad('profileManagement.played')+': '+profil.played+'</u><span data-id="'+profil.id+'" class="deleteProfil pointer icon icon-deleteChar"></span></div>';
			}
			divShow.innerHTML = htmlContent;

			let btnDeletes = document.getElementsByClassName('deleteProfil');
			for(let i=0;i < btnDeletes.length; i++){
				btnDeletes[i].onclick = function(e){
					e.stopPropagation();
					if(confirm(getTrad('profileManagement.deleteConfirm'))){

						let idToDelete = this.getAttribute('data-id');
						deleteProfile(idToDelete);

						if(getProfileId() == idToDelete)
							manageProfile();

						profilePage();
						showPage('main-profile','main-profile');

					}
				}
			}

			let btnChangeProfile = document.getElementsByClassName('profilDisplay');
			for(let i=0;i < btnChangeProfile.length; i++){
				btnChangeProfile[i].onclick = function(){
					let idToChange = this.getAttribute('data-id');
					changeProfile(idToChange);
					showPage('main-profile','main-menu');
				}
			}
		}else{
			divShow.innerHTML = '';
		}

		let from = getStorage('currentPage');
		showPage(from,'main-profile');

		getId('createProfile').onclick = function() {
			let nameProfile = getId('newNameProfile').value;
			nameProfile = nameProfile.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
			const regexClean = /[^a-zA-Z0-9_ -]/g;
			nameProfile = nameProfile.replaceAll(regexClean,'');
			if(nameProfile !== ''){
				manageProfile(nameProfile);
				location.reload();
			}
			return false;
		};
	}
	function savegamePage(){
		let player = getCharacter('player');
		let saves = getStorage('saves');
		let contentElem = getId('main-savegame').querySelector('content');

		if(player.mod !== undefined && player.mod.hardcore){
			addClass(getId('createLocalSave'),'hide');
			addClass(getId('btnExport'),'hide');
		}else{
			removeClass(getId('createLocalSave'),'hide');
			removeClass(getId('btnExport'),'hide');
		}

		let indSave = 1;
		if(saves !== false && Object.keys(saves).length > 0){
			indSave = Object.keys(saves).length+1;
			let contentToInsert = [];
			for(let saveId in saves){
				let save = saves[saveId];
				if(save == null)
					continue;

				//Dont overwrite the hardcore save
				let iconSave = '<span class="containerIcon"><span class="icon icon-savegame"></span></span>';
				if((save.isHardcore !== undefined && save.isHardcore) || player === false)
					iconSave = '';

				contentToInsert.push('<li data-id="'+saveId+'">'+
										'<div class="saveInfo">'+
											save.name+' / '+(save.player?save.player:'')+'<br>'+
											'<i>'+save.date+'</i>'+
										'</div>'+
										'<div class="saveIcon">'+
											iconSave+
											'<span class="containerIcon"><span class="icon icon-in"></span></span>'+
											'<span class="containerIcon"><span class="icon icon-trash"></span></span>'+
										'</div>'+
									'</li>');
				if('Save-'+indSave == save.name)
					indSave++;

			}
			contentElem.innerHTML = '<ul>'+contentToInsert.join('')+'</ul>';
		}else{
			contentElem.innerHTML = '<div class="centerContent">'+getTrad('mainmenu.nosave')+'</div>';
		}
		getId('nameDoSave').value = 'Save-'+indSave;

		//Can't save localy if sessionStorage is used
		if(sessionStorage.length > 0){
			addClass(getId('createLocalSave'),'hide');
		}

		//Control to create new save
		getId('btnDoSave').onclick = function(e) {
			let nameDoSave = getId('nameDoSave').value;
			saveTheGame(nameDoSave,nameDoSave);

			let current = getStorage('currentPage');
			let previous = getStorage('backPage');
			if(previous == false || previous == current)
				previous = 'main-menu';
			showPage(current,previous);
		}

		//Export the save
		getId('btnExport').onclick = function(e) {
			let gameState = getStorage('gameState');
			let nameTime = (gameState.time == 'nextDay' ? ucfirst(getTrad('basic.time.night')) : ucfirst(getTrad('basic.time.'+gameState.time)));
			let dateNow = ucfirst(getTrad('basic.day'))+': '+gameState.dayNumber+' / '+nameTime;
			let player = getCharacter('player');
			let filename = 'wracked_'+player.firstname+'_'+player.lastname+'_'+dateNow+'.json';

			let tmpSave = document.createElement('a');
			tmpSave.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(getSaveInfo()));
			tmpSave.setAttribute('download', filename);

			tmpSave.style.display = 'none';
			document.body.appendChild(tmpSave);

			tmpSave.click();

			document.body.removeChild(tmpSave);
		}

		//Import a save
		getId('btnImport').onchange = function(e) {
			if (this.length == 0) return;

			let file = this.files[0];
			let reader = new FileReader();
			reader.onload = (e) => {

				let jsonSave = JSON.parse(e.target.result);

				deleteStorage('stateGame');
				for(let elemId in jsonSave){
					if(jsonSave[elemId] === undefined||jsonSave[elemId] === false){
						deleteStorage(elemId);
					}else{
						setStorage(elemId,jsonSave[elemId]);
					}
				}
				retrieveContent();
				getId('btnImport').value = '';
			};
			reader.onerror = (e) => alert(e.target.error.name);

			reader.readAsText(file);
		}

		//Controle to load a save
		let btnsLoad = contentElem.querySelectorAll('li span.icon-in');
		btnsLoad.forEach(function(element){
			element.onclick = function(e) {

				clearPage();

				cleanStorage();

				let saveId = this.parentNode.parentNode.parentNode.getAttribute('data-id');
				let saves = getStorage('saves');
				let save = JSON.parse(saves[saveId].content);

				deleteStorage('stateGame');
				for(let elem of elemsToSave){
					if(save[elem] === undefined||save[elem] === false){
						deleteStorage(elem);
					}else{
						setStorage(elem,save[elem]);
					}
				}

				manageFans();

				//Count how many load there was
				let player = getCharacter('player');
				player.set('stats.loadgame','++');
				
				retrieveContent();
				let current = getStorage('currentPage');
				showPage(current,'main-gamewindow');

				getId('main-savegame').style.display = 'none';
			}
		});

		//Controle to delete a save
		let btnsDelete = contentElem.querySelectorAll('li span.icon-trash');
		btnsDelete.forEach(function(element){
			element.onclick = function(e) {
				let saveId = this.parentNode.parentNode.parentNode.getAttribute('data-id');
				let saves = getStorage('saves');
				delete saves[saveId];

				setStorage('saves',saves);

				this.parentNode.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode.parentNode);
			}
		});

		//Controle to overwrite a save
		let btnsOverwrite = contentElem.querySelectorAll('li span.icon-savegame');
		btnsOverwrite.forEach(function(element){
			element.onclick = function(e) {
				let saveId = this.parentNode.parentNode.parentNode.getAttribute('data-id');
				let saves = getStorage('saves');
				let save = saves[saveId];
				
				saveTheGame(saveId,save.name);

				let current = getStorage('currentPage');
				let previous = getStorage('backPage');
				if(previous == false || previous == current)
					previous = 'main-menu';
				showPage(current,previous);
			}
		});

		let from = getStorage('currentPage');
		showPage(from,'main-savegame');
	}
	function characterDetailsData(characterId){
		let character = getCharacter(characterId);
		let data = {};

		//Picture and First Info
			let picture = character.get('pict');
			if(character.get('profilePictsSet') !== undefined){
				let setPict = window.database.participants[character.get('archetype')].profilePicts[character.get('profilePictsSet')];
				if(characterId == 'player'){
					let pictureIndex = character.getStateProfile();
					picture = setPict[pictureIndex];
				}else{
					let nbStage = window.database.difficulty[getStorage('difficulty')].nbStage;
					if(character.get('stage') >= nbStage)
						picture = setPict[setPict.length-1];
					else
						picture = setPict[Math.ceil((setPict.length-1) * character.get('stage')/nbStage)];
				}
			}
			data.ident = characterId;
			data.picture = picture;
			data.name = character.get('firstname')+' '+character.get('lastname');
			data.other = character.get('age')+' '+getTrad('profile.yearsold')+', '+getTrad('profile.jobs.'+character.get('job'));

		//Other Info
			let passions = [];
			for(let passion of character.get('passions')){
				if(character.havePerk('crazyworld'))
					passions.push('<pink>'+getTrad('profile.passions.'+passion)+'</pink>');
				else
					passions.push(getTrad('profile.passions.'+passion));
			}
			if(character.get('passionsTransformed') !== undefined){
				for(let passion of character.get('passionsTransformed')){
					if(!character.havePerk('crazyworld'))
						passions.push('<pink>'+getTrad('profile.passions.'+passion)+'</pink>');
					else
						passions.push(getTrad('profile.passions.'+passion));
				}
			}

			let iqHere = character.get('iq');
			let sexualpref = getTrad('profile.sexualpref.'+character.get('sexualpref'));
			if(character.get('sexualpref') == 'heterosexual'){
				sexualpref += ' ('+ucfirst(getTrad('basic.gender.'+(this.gender == 'man'?'women':'men')))+')';
			}else if(character.get('sexualpref') == 'homosexual'){
				sexualpref += ' ('+ucfirst(getTrad('basic.gender.'+(this.gender == 'man'?'men':'women')))+')';
			}
			if(characterId == 'player'){
				iqHere = Math.floor(character.get('iq') - ((character.get('iq') - 70) * character.get('bimbo') / 100));
			}
			let infoFill = {
				"gender":ucfirst(getTrad('basic.gender.'+character.get('gender'))),
				"iq":iqHere,
				"birthday":character.get('birthday'),
				"astro":getTrad('astrologicalsign.'+character.get('astrologicSign')),
				"sexualpref":sexualpref,
				"city":character.get('city'),
				"passions":passions.join(', '),
			};
			data.infoFill = infoFill;

		//Album			
			data.album = character.album;

		//Testimonial
			data.testimonial = character.get('testimonial');

		//Perks
			if(characterId == 'player' && setting('profileperks')){
				data.perks = character.perks;
			}

		return data;
	}
	function characterDetailsShow(dataToDisplay,index = null){
		removeClass(getId('profileNav'),'hide');

		//Picture and First Info
			getId('profilePicture').innerHTML = imgVideo(dataToDisplay.picture);
			getId('profileName').innerHTML = dataToDisplay.name;
			getId('profileNameOther').innerHTML = dataToDisplay.other;

		//Other Info
			let infoTab = [];
			for(let infoId in dataToDisplay.infoFill){
				infoTab.push(
					'<div class="partTitle">'+getTrad('profile.title.'+infoId)+'</div>'+
					'<div class="partContent">'+dataToDisplay.infoFill[infoId]+'</div>'
				);
			}

			getId('profileInfo').innerHTML = '<ul><li>'+infoTab.join('</li><li>')+'</li></ul>';

		//Album
			getId('titleAlbum').innerHTML = (dataToDisplay.ident == 'player'?getTrad('profile.title.myalbum'):getTrad('profile.title.albums',getCharacter(dataToDisplay.ident)));
			getId('profileAlbumSection').innerHTML = dataToDisplay.album;

		//Testimonial
			removeClass(getId('profileTestiBase'),'hide');
			getId('profileTestimonial').innerHTML = dataToDisplay.testimonial;

		//Perks
			if(dataToDisplay.ident == 'player' && setting('profileperks')){
				let perks = (index == 'last' ? getCharacter(dataToDisplay.ident).perks : dataToDisplay.perks);

				removeClass(getId('profilePerks'),'hide');
				let gameState = getStorage('gameState');
				getId('profilePerksContent').innerHTML = dailyRecapPerks(gameState,perks);
				renderStuff();
			}else{
				addClass(getId('profilePerks'),'hide');
				getId('profilePerksContent').innerHTML = '';
			}

	}
	function characterDetails(characterId){
		
		if(characterId !== undefined)
			setStorage('profileChar',characterId);
		else
			characterId = getStorage('profileChar');

		let character = getCharacter(characterId);
		if(character === false){	//In case it was on the Others during F5
			return characterOther(characterId);
		}

		let dataToDisplay = character.get('previousProfile')[character.get('previousProfile').length-1];
		characterDetailsShow(dataToDisplay,'last');

		activatePageTabs('profileChar');
		let btnSwitch = getId('profileChar').querySelectorAll('.subPageTitle div');
		btnSwitch[0].click();

		addClass(getId('profileHistoPrev'),'hide');
		addClass(getId('profileHistoNext'),'hide');
		if(setting('highlightchange') && character.get('previousProfile').length > 1){
			removeClass(getId('profileHistoPrev'),'hide');
			removeClass(getId('profileHisto'),'hide');
			getId('profileHistoPrev').setAttribute('data-index',character.get('previousProfile').length-2);
			addClass(getId('profileHistoNext'),'hide');

			getId('profileHistoPrev').onclick = function(e){
				let character = getCharacter(getStorage('profileChar'));
				let index = this.getAttribute('data-index');
				let indexInfo = (index == character.get('previousProfile').length-1 ? 'last' : index);
				characterDetailsShow(character.get('previousProfile')[index],indexInfo);
				if(index > 0){
					getId('profileHistoPrev').setAttribute('data-index',parseInt(index)-1);
				}else{
					addClass(getId('profileHistoPrev'),'hide');
				}

				removeClass(getId('profileHistoNext'),'hide');
				getId('profileHistoNext').setAttribute('data-index',parseInt(index)+1);
			};
			getId('profileHistoNext').onclick = function(e){
				let character = getCharacter(getStorage('profileChar'));
				let index = this.getAttribute('data-index');
				let indexInfo = (index == character.get('previousProfile').length-1 ? 'last' : index);
				removeClass(getId('profileHistoPrev'),'hide');
				if(index == character.get('previousProfile').length - 1){
					characterDetailsShow(character.get('previousProfile')[index],indexInfo);
					addClass(getId('profileHistoNext'),'hide');
					getId('profileHistoPrev').setAttribute('data-index',parseInt(index)-1);
				}else{
					characterDetailsShow(character.get('previousProfile')[index],indexInfo);
					getId('profileHistoPrev').setAttribute('data-index',parseInt(index)-1);
					getId('profileHistoNext').setAttribute('data-index',parseInt(index)+1);
				}
			};
		}

		//Player Char react to the bullshit on the profile
		if(characterId == 'player' && (character.info === undefined||character.info.firstProfil === undefined)){

			let contentDisplay = [];
			contentDisplay.push(giveDiscussText({"who":"player","pictType":"pict"},getTrad('profile.firstreact.player1',{'player':character})));
			contentDisplay.push(giveDiscussText({"who":"ia","pictType":"laughing"},getTrad('profile.firstreact.ai1',{'player':character})));
			contentDisplay.push(giveDiscussText({"who":"player","pictType":"pict"},getTrad('profile.firstreact.player2',{'player':character})));
			contentDisplay.push(giveDiscussText({"who":"ia"},getTrad('profile.firstreact.ai2',{'player':character})));
			contentDisplay.push(giveDiscussText({"who":"player","pictType":"pict"},getTrad('profile.firstreact.player3',{'player':character})));
			contentDisplay.push(giveDiscussText({"who":"ia","pictType":"upset"},getTrad('profile.firstreact.ai3',{'player':character})));
			showPopup(contentDisplay.join(''),'firstTimeProfile');

			let info = character.info;
			if(info === undefined)
				info = {};
			info.firstProfil = true;
			character.set('info',info);
		}

		let from = getStorage('currentPage');
		showPage(from,'profileChar');
		window.scrollTo(0, 0);
	}
	function characterOther(characterId){
		setStorage('profileChar',characterId);
		let characterSec = getStorage('characterSec');
		let character = characterSec[characterId];
		let charInfo = clone(window.database.characterSec[characterId]);
		let setInfo = charInfo.set[character.set];

		addClass(getId('profileNav'),'hide');
		addClass(getId('profileHisto'),'hide');

		//Picture and First Info
			if(setInfo.portrait !== undefined)
				getId('profilePicture').innerHTML = imgVideo(setInfo.portrait);
			else
				getId('profilePicture').innerHTML = imgVideo(setInfo.speaking);
			getId('profileName').innerHTML = getTrad(character.name);
			getId('profileNameOther').innerHTML = '';
			if(charInfo.smallDescription !== undefined && charInfo.smallDescription.length > 0){
				for(let descId in charInfo.smallDescription){
					let testDesc = charInfo.smallDescription[descId];
					if(testDesc.conditions !== undefined && !checkCond(testDesc.conditions))
						continue;
					getId('profileNameOther').innerHTML = getTrad(testDesc.text);
					break;
				}
			}

		//Other Info
			getId('profileInfo').innerHTML = getTrad('basic.nomoreinformation');
			if(charInfo.description !== undefined && charInfo.description.length > 0){
				for(let descId in charInfo.description){
					let testDesc = charInfo.description[descId];
					if(testDesc.conditions !== undefined && !checkCond(testDesc.conditions))
						continue;
					getId('profileInfo').innerHTML = getTrad(testDesc.text);
					break;
				}
			}

		//Album
			getId('titleAlbum').innerHTML = '';
			getId('profileAlbumSection').innerHTML = '';

		//Testimonial
			addClass(getId('profileTestiBase'),'hide');
			getId('profileTestimonial').innerHTML = '';

		//Perks
			addClass(getId('profilePerks'),'hide');
			getId('profilePerksContent').innerHTML = '';

		let from = getStorage('currentPage');
		showPage(from,'profileChar');
		window.scrollTo(0, 0);
	}
	function characterList(){

		let characters = getStorage('characters');
		let characterSec = getStorage('characterSec');
		let progressnumber = setting('progressnumber');
		let nbStage = window.database.difficulty[getStorage('difficulty')].nbStage;

		//Housemates
			let contentDisplay = getId('housemateList');
			let contentToInsert = [];
			let outHousemate = [];
			for(charId in characters){
				let character = getCharacter(charId);

				let barDisplay = '';
				if(progressnumber === true && charId !== 'player'){
					let ratio = Math.round(character.stage * 100 / nbStage);
					barDisplay = '<div class="barSuccess barMeter">'+
									'<div class="barText"><span class="barTextSpan">'+getTrad('basic.progress')+': '+character.stage+'/'+nbStage+'</span></div>'+
									'<span class="barBar" style="width: '+ratio+'%;"></span>'+
								'</div>';
				}

				let classHere = '';
				let addContent = '';
				if(character.out !== undefined && character.out && setting('defeatedhousemate') === 'out'){
					classHere = 'housemateOut';
					addContent = '<span class="displayOut">'+getTrad('basic.housemateout',character)+'</span>';
				}
				let html = '<li data-id="'+charId+'" class="'+classHere+'">'+ 
								'<div class="smallDescPict"><img src="'+character.get('pict')+'"></div>'+
								barDisplay+
								'<div class="smallDescName">'+character.get('firstname')+' '+character.get('lastname')+'</div>'+
								'<div class="smallDescOther">'+
									character.get('age')+' '+getTrad('profile.yearsold')+'<br>'+
									getTrad('profile.jobs.'+character.get('job'))+
								'</div>'+
								addContent+
							'</li>';
				if(character.out !== undefined && character.out && setting('defeatedhousemate') === 'out'){
					outHousemate.push(html);
				}else{
					contentToInsert.push(html);
				}
			}
			contentDisplay.innerHTML = contentToInsert.join('');

			if(outHousemate.length > 0){
				contentDisplay.innerHTML += outHousemate.join('');
			}

			let player = getCharacter('player');
			getId('charListIA').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('profile.iadesc',player));

		//Others
			contentDisplay = getId('othersList');
			contentToInsert = [];
			for(charId in characterSec){
				let character = characterSec[charId];

				if(character.info.seen === undefined || !character.info.seen)
					continue;

				let barDisplay = '';
				if(progressnumber === true && charId !== 'player'){
					let ratio = Math.round(character.appreciation);
					barDisplay = '<div class="barSuccess barMeter">'+
									'<div class="barText"><span class="barTextSpan">'+getTrad('basic.appreciation')+': '+ratio+'/100</span></div>'+
									'<span class="barBar" style="width: '+ratio+'%;"></span>'+
								'</div>';
				}
				let charInfo = clone(window.database.characterSec[charId]);
				let setInfo = charInfo.set[character.set];
				let addContent = '';
				if(charInfo.smallDescription !== undefined && charInfo.smallDescription.length > 0){
					for(let descId in charInfo.smallDescription){
						let testDesc = charInfo.smallDescription[descId];
						if(testDesc.conditions !== undefined && !checkCond(testDesc.conditions))
							continue;
						addContent = '<div class="smallDescOther">'+getTrad(testDesc.text)+'</div>';
						break;
					}
				}
				let html = '<li data-id="'+charId+'" data-type="other">'+ 
								'<div class="smallDescPict">'+imgVideo(setInfo.speaking)+'</div>'+
								barDisplay+
								'<div class="smallDescName">'+getTrad(character.name)+'</div>'+
								addContent+
							'</li>';
				contentToInsert.push(html);
			}
			contentDisplay.innerHTML = contentToInsert.join('');

		let imgsDesc = getId('listOfCharacters').querySelectorAll('li');
		imgsDesc.forEach(function(element){
			element.onclick = function(e) {
				let idChar = this.getAttribute('data-id');
				let typeChar = this.getAttribute('data-type');
				if(typeChar !== null && typeChar == 'other')
					characterOther(idChar);
				else
					characterDetails(idChar);
			}
		});

		let from = getStorage('currentPage');
		showPage(from,'listOfCharacters');

		activatePageTabs('listOfCharacters');
	}
	function achievementPage(){

		let achievements = getStorage('achievements');
		let typeOfAchievements = ['others','loses','wins'];

		let content = [];
		for(let type of typeOfAchievements){
			for(let aId in window.database.achievements[type]){
				let aInfo = window.database.achievements[type][aId];
				let img = aInfo.img;
				let more = '';
				let titleAchievement = getTrad('achievements.'+aId+'.title');
				let descAchievement = getTrad('achievements.'+aId+'.desc');
				let classes = ['achievementBlock'];
				if(achievements === false||achievements[aId] === undefined){
					img = window.database.achievements.defaultPict;
					if(aInfo.secret !== undefined && aInfo.secret){
						titleAchievement = '<wavy>'+titleAchievement.replace(new RegExp(`[^ ]`, 'g'), '?')+'</wavy>';
						descAchievement = '<wavy>'+descAchievement.replace(new RegExp(`[^ ]`, 'g'), '?')+'</wavy>';
					}
				}else{
					more = '<div class="achievementDate">('+achievements[aId].split('T')[0]+')</div>';
					classes.push('unlocked');
				}
				content.push(`<div class="`+classes.join(' ')+`">
								<div class="achievementPicture">
									<img src="`+img+`">
								</div>
								<div class="achievementText">
									<div class="achievementTitle">`+titleAchievement+`</div>
									<div class="achievementDesc">`+descAchievement+`</div>
									`+more+`
								</div>
							</div>`);
			}
		}

		getId('main-achievement').querySelector('content').innerHTML = content.join('');

		getId('resetAchievement').onclick = function(){
			if(confirm(getTrad('optionmenu.resetachievement'))){
				if(confirm(getTrad('optionmenu.resetforreal'))){
					deleteStorage('achievements');
					achievementPage();
					showPopup(getTrad('optionmenu.resetdeleted'),'div-success',2000);
				}
			}
		}

		let from = getStorage('currentPage');
		showPage(from,'main-achievement');
	}
	function showStore(){

		let player = getCharacter('player');
		let html = '<div class="centerContent">'+getTrad('basic.youhavexvote',{'nbvote':player.get('votes')})+'</div>';

		let buyable = clone(window.database.buyable);

		removeClass(getId('storeMain'),'hide');
		addClass(getId('storeDetail'),'hide');

		let sortObjects = {};
		let craveItem = {};
		for(let id in buyable){
			let item = buyable[id];
			if(sortObjects[item.type] === undefined)
				sortObjects[item.type] = {};

			if(item.crazyworld !== undefined){
				if(player.havePerk('crazyworld') && !item.crazyworld)
					continue
				else if(!player.havePerk('crazyworld') && item.crazyworld)
					continue;
			}

			if(item.hide !== undefined && item.hide){
				if(id == 'boobsrejuv'){
					let sizeBoobs = clone(window.database.boobsSize);
					let sizeBaseArchetype = window.database.participants[player.archetype].sizeBoobs;
					let enlargementLvl = (player.inventory.boobsenlargement !== undefined ? player.inventory.boobsenlargement.stage : 0);
					if(sizeBoobs.indexOf(sizeBaseArchetype)+enlargementLvl <= sizeBoobs.indexOf(player.sizeBoobs)){
						continue;
					}
				}else{
					continue;
				}
			}

			//Sold out
			if(item.stage !== undefined){
				let stage = (player.get('inventory')[id] !== undefined ? player.get('inventory')[id].stage + 1 : 1);
				if(item['pictStage'+stage] === undefined)
					item.soldout = 'pictStage'+(stage-1);
			}

			sortObjects[item.type][id] = item;

			if(item.crave !== undefined && item.soldout === undefined){
				craveItem[item.crave] = id;
			}
		}

		//Crave, force to buy
		removeClass(getId('storeMain').querySelector('.backBtn'),'hide');
		let craveItemId = null;
		for(let crave in craveItem){
			if(parseInt(player.get(crave)) >= window.database.difficulty[getStorage('difficulty')].craveCounter){
				craveItemId = craveItem[crave];
				let newObjects = {};
				for(let type in sortObjects){
					newObjects[type] = [];
					for(let id in sortObjects){
						newObjects[type].push(buyable[craveItemId]);
					}
				}
				sortObjects = newObjects;

				if(getPrice(craveItemId) < player.get('votes')){
					addClass(getId('storeMain').querySelector('.backBtn'),'hide');
				}
			}
		}

		let seeBarStat = setting('progressnumber');
		for(let type in sortObjects){
			html += '<div class="storeSection"><h3>'+getTrad('buyabletype.'+type)+'</h3><ul class="inventory">';
			for(let id in sortObjects[type]){


				let price = getPrice(id);
				let disabled = (price > player.get('votes') ? 'disabled="disabled"' : '');
				let titleHere = getTrad('basic.buynow');
				let textHere = getTrad('basic.buyitforxvote',{'price':price});
				let styleHere = '';
				
				if(craveItemId !== null)
					id = craveItemId;

				let item = buyable[id];

				//If not forced and a crave item display the clue
				if(craveItemId === null && item.crave !== undefined && seeBarStat){
					let pourcCrave = Math.round(parseInt(player.get(item.crave)) / window.database.difficulty[getStorage('difficulty')].craveCounter * 100) / 100;
					styleHere = 'box-shadow: 0px 0px 15px 5px rgb(255, 0, 255, '+pourcCrave+');';
				}

				let pict = item.pict;
				if(item.soldout !== undefined){
					pict = item[item.soldout];
					disabled = 'disabled="disabled"';
					textHere = getTrad('basic.soldout');
				}else if(item.pictStage1 !== undefined){
					let stage = (player.get('inventory')[id] !== undefined ? player.get('inventory')[id].stage + 1 : 1);
					pict = item['pictStage'+stage];
				}

				let nameItem = getTrad('buyable.'+id+'.name');
				if(item.stage !== undefined && player.inventory[id] !== undefined){
					if(testTrad('buyable.'+id+'.namestage'+player.inventory[id].stage)){
						nameItem = getTrad('buyable.'+id+'.namestage'+player.inventory[id].stage);
					}
				}

				html += '<li '+disabled+' class="" data-id="'+id+'" style="'+styleHere+'" title="'+getTrad('basic.lookatit')+'">'+
									'<span class="imgInventory">'+imgVideo(pict)+'</span>'+
									'<div class="imgName">'+nameItem+'</div>'+
									'<div class="buying" '+disabled+' data-id="'+id+'" title="'+titleHere+'">'+textHere+'</div>'+
							'</li>';
			}
			html += '</ul></div>';
		}

		getId('storeMain').querySelector('content').innerHTML = html;

		getId('btnStoreBack').onclick = function(){
			removeClass(getId('storeMain'),'hide');
			addClass(getId('storeDetail'),'hide');
		}

		//Btn Buy
		let btnsBuy = getId('storeMain').querySelectorAll('content .buying:not([disabled]');
		btnsBuy.forEach(function(btn){
			btn.onclick = function(e) {
				e.stopPropagation();
				let id = this.getAttribute('data-id');

				getCharacter('player').buyItem(id);

				retrieveSidebar();
				showStore();

				showBuyPopup(id);
			};
		});

		//Btn Detail
		let invObject = getId('storeMain').querySelectorAll('content li');
		invObject.forEach(function(btn){
			btn.onclick = function(e) {
				let id = this.getAttribute('data-id');

				let player = getCharacter('player');
				let buyable = clone(window.database.buyable);
				let price = getPrice(id);
				let isBuyable = (price <= player.get('votes'));

				let item = buyable[id];
				let pict = item.pict;
				if(item.pictStage1 !== undefined){
					let stage = (player.get('inventory')[id] !== undefined ? player.get('inventory')[id].stage + 1 : 1);
					if(item['pictStage'+stage] === undefined){
						pict = item['pictStage'+(stage-1)];
						isBuyable = false;
					}else{
						pict = item['pictStage'+stage];
					}
				}

				let html = [];
				html.push('<h1>'+getTrad('buyable.'+id+'.name')+'</h1>')
				html.push('<div class="centerContent">'+imgVideo(pict)+'</div>');
				html.push('<div class="centerContent">'+getTrad('buyable.'+id+'.desc')+'</div>');

				if(isBuyable){
					html.push('<div class="centerContent"><div class="btn btn-success" data-id="'+id+'">'+getTrad('basic.buyitforxvote',{'price':price})+'</div></div>');
				}
				
				getId('storeDetail').querySelector('content').innerHTML = html.join('');
				addClass(getId('storeMain'),'hide');
				removeClass(getId('storeDetail'),'hide');

				let modItemBtn = getId('storeDetail').querySelector('.btn-success');
				if(modItemBtn !== undefined && modItemBtn !== null){
					modItemBtn.onclick = function(){
						let id = this.getAttribute('data-id');

						getCharacter('player').buyItem(id);

						retrieveSidebar();
						showStore();

						showBuyPopup(id);
					}
				}
			};
		});

		let from = getStorage('currentPage');
		showPage(from,'storePage');
	}
	function showInventory(){

		function getInventoryInfo(id){

			let info = {'name':'','pict':'','desc':''};

			let actions = clone(window.database.actions);
			let buyable = clone(window.database.buyable);

			let inventory = getCharacter('player').get('inventory');
			let item = inventory[id];
			if(actions[id] !== undefined){
				info.pict = (item.modified ? actions[id].pictmod : actions[id].pictbase);
				info.name = getTrad('actions.'+id+'.name');
				info.type = 'actions';

				if(item.modified){
					info.desc = getTrad('actions.'+id+'.modified');
				}else{
					info.desc = getTrad('actions.'+id+'.desc');
					if(inventory[item.object] !== undefined && inventory[item.object].quantity > 0){
						info.modifiable = {'id':item.object};
					}
				}
			}else if(buyable[id] !== undefined){
				if(item.notinventory !== undefined && item.notinventory)
					return false;
				if(item.stage !== undefined && item.stage == 0)
					return false;

				info.pict = (item.stage !== undefined ? buyable[id]['pictStage'+item.stage] : buyable[id].pict);
				info.name = getTrad('buyable.'+id+'.name');
				info.type = 'buyable';
				info.desc = getTrad('buyable.'+id+'.desc');
			}

			info.nameDisplay = info.name;
			if(item.quantity !== undefined){
				info.quantity = item.quantity;
				info.nameDisplay += ' x '+item.quantity;
			}

			return info;
		}

		removeClass(getId('inventoryMain'),'hide');
		addClass(getId('inventoryDetail'),'hide');

		let player = getCharacter('player');
		let inventory = player.get('inventory');

		let stuff = [];
		let html = '<div class="centerContent">'+getTrad('basic.nothinghere')+'</div>';
		if(Object.keys(inventory).length > 0){
			for(let i in inventory){
				let info = getInventoryInfo(i);

				if(info !== false){
					stuff.push('<li class="" data-id="'+i+'" data-type="'+info.type+'">'+
									'<span class="imgInventory"><img src="'+info.pict+'"></span>'+
									'<div class="imgName">'+info.nameDisplay+'</div>'+
							'</li>');
				}
			}
			html = '<ul class="inventory">'+stuff.join('')+'</ul>';
		}

		getId('inventoryMain').querySelector('content').innerHTML = html;
		getId('btnInventoryBack').onclick = function(){
			removeClass(getId('inventoryMain'),'hide');
			addClass(getId('inventoryDetail'),'hide');
		}

		//Btn Object details
		let invObject = getId('inventoryMain').querySelectorAll('content li');
		invObject.forEach(function(btn){
			btn.onclick = function(e) {
				let id = this.getAttribute('data-id');
				let type = this.getAttribute('data-type');

				let info = getInventoryInfo(id);

				let html = [];
				html.push('<h1>'+info.name+'</h1>')
				html.push('<div class="centerContent"><img src="'+info.pict+'"></div>');
				html.push('<div class="centerContent">'+info.desc+'</div>');

				if(info.modifiable !== undefined){
					html.push('<div class="centerContent "><div class="useBtn" data-id="'+id+'">'+
									'<img src="'+window.database.buyable[info.modifiable.id].pict+'">'+
									'<span>'+getTrad('basic.useitem',{'name':getTrad('buyable.'+info.modifiable.id+'.name')})+'</span>'+
								'</div></div>');
				}
				
				getId('inventoryDetail').querySelector('content').innerHTML = html.join('');
				addClass(getId('inventoryMain'),'hide');
				removeClass(getId('inventoryDetail'),'hide');

				let modItemBtn = getId('inventoryDetail').querySelector('.useBtn');
				if(modItemBtn !== undefined && modItemBtn !== null){
					modItemBtn.onclick = function(){				//Modify the item
						let id = this.getAttribute('data-id');

						getCharacter('player').modItem(id);

						showInventory();
					}
				}
			};
		});

		let from = getStorage('currentPage');
		showPage(from,'inventoryPage');
	}
	function patchnotesPage(){
		let patches = window.database.patchnotes;
		let whereToInsert = getId('main-patchNotes').querySelector('ul');
		whereToInsert.innerHTML = '';
		for(let patch of patches){
			whereToInsert.innerHTML += '<li>'+
											'<u>'+patch.date+' : '+patch.name+'</u><br>'+
											'<span class="text">'+getTrad(patch.desc)+'</span>'+
										'</li>';
		}

		let from = getStorage('currentPage');
		showPage(from,'main-patchNotes');
	}

/********** NEW GAME *******/
	function newGamePage(){

		//Reset the starting pages
		let allPages = getId('main-newGame').querySelectorAll('div.pageContent');
		for(let page of allPages){
			addClass(page,'hide');
		}
		removeClass(allPages[0],'hide');

		let from = getStorage('currentPage');
		showPage(from,'main-newGame');

		getId('skipPrologue').setAttribute('disabled','disabled');
		getId('startNewGame').querySelector('.changeStep').setAttribute('disabled','disabled');
		let errorsField = getId('startNewGame').querySelectorAll('.newgameError');
		for(let elem of errorsField){
			elem.innerHTML = '';
		}

		//Difficulty
			let difficultyData = window.database.difficulty;
			let contentToInsert = [];
			for(let difficulty in difficultyData){
				let classAdd = '';
				if(contentToInsert.length == 0)
					classAdd = 'highlight';
				contentToInsert.push('<div class="divDiff '+classAdd+'" data-id="'+difficulty+'"><div class="titleDiff">'+getTrad('newgame.difficulty.'+difficulty)+'</div><div class="descDiff">'+getTrad('newgame.difficulty.'+difficulty+'desc')+'</div></div>')
			}
			getId('difficultyField').innerHTML = contentToInsert.join('');
			for(let divDiff of getId('difficultyField').querySelectorAll('.divDiff')){
				divDiff.onclick = function(){
					for(let tmp of getId('difficultyField').querySelectorAll('.divDiff')){
						removeClass(tmp,'selected');
						removeClass(tmp,'highlight');
					}
					addClass(this,'selected');
				}
			}

		//Gender
			function checkPerkImg(){
				let genderId = (getId('genderField').querySelector('.selected') !== null ? getId('genderField').querySelector('.selected').getAttribute('data-id') : getId('genderField').querySelector('.highlight').getAttribute('data-id'));
				if(genderId == 'man'){
					let perkMan = getId('perksField').querySelectorAll('.perkMan');
					for(let pict of perkMan){
						removeClass(pict,'hide');
					}
					let perkWoman = getId('perksField').querySelectorAll('.perkWoman');
					for(let pict of perkWoman){
						addClass(pict,'hide');
					}
				}else{
					let perkMan = getId('perksField').querySelectorAll('.perkMan');
					for(let pict of perkMan){
						addClass(pict,'hide');
					}
					let perkWoman = getId('perksField').querySelectorAll('.perkWoman');
					for(let pict of perkWoman){
						removeClass(pict,'hide');
					}
				}
			}
			let genders = window.database.characterInfo.gender;
			contentToInsert = [];
			for(let genderId in genders){
				contentToInsert.push('<img src="'+genders[genderId].pict+'" data-id="'+genderId+'" title="'+ucfirst(getTrad('basic.gender.'+genderId))+'">');
			}
			getId('genderField').innerHTML = contentToInsert.join('');
			for(let divDiff of getId('genderField').querySelectorAll('img')){
				divDiff.onclick = function(){
					for(let tmp of getId('genderField').querySelectorAll('img')){
						removeClass(tmp,'highlight');
					}
					if(haveClass(this,'selected'))
						toggleClass(this,'selected');
					else{
						for(let tmp of getId('genderField').querySelectorAll('img')){
							removeClass(tmp,'selected');
						}
						toggleClass(this,'selected');
					}
					if(haveClass(this,'selected')){
						checkPerkImg();
					}
					sliderHide();
				}
			}

		//Hair Color
			let hairColors = [];
			let participantsData = window.database.participants;
			let archetypeAvailables = archetypeDispo('start');
			for(let participantId of archetypeAvailables){
				let participantInfo = participantsData[participantId];
				hairColors.push(participantInfo.hairColor);
			}
			hairColors = arrayUnique(hairColors);
			contentToInsert = [];
			for(let hairColor in window.database.characterInfo.hairColor){
				let hairColorInfo = window.database.characterInfo.hairColor[hairColor];
				let classHere = '';
				if(hairColors.indexOf(hairColor) === -1)
					classHere = 'disabled';
				contentToInsert.push('<img class="'+classHere+'" src="'+hairColorInfo.pict+'" data-id="'+hairColor+'" title="'+ucfirst(getTrad('basic.color.'+hairColor))+'">');
			}
			getId('haircolorField').innerHTML = contentToInsert.join('');
			for(let divDiff of getId('haircolorField').querySelectorAll('img')){
				divDiff.onclick = function(){
					for(let tmp of getId('haircolorField').querySelectorAll('img')){
						removeClass(tmp,'highlight');
					}
					if(!haveClass(this,'disabled')){
						if(haveClass(this,'selected'))
							toggleClass(this,'selected');
						else{
							for(let tmp of getId('haircolorField').querySelectorAll('img')){
								removeClass(tmp,'selected');
							}
							toggleClass(this,'selected');
						}
						sliderHide();
					}
				}
			}

		//Faces
			function sliderHide(){
				let allPictNewGame = getId('slidersFace').querySelectorAll('img');
				let genderChoice = getId('genderField').querySelector('.selected');
				if(genderChoice !== null)
					genderChoice = genderChoice.getAttribute('data-id');
				let haircolorChoice = getId('haircolorField').querySelector('.selected');
				if(haircolorChoice !== null)
					haircolorChoice = haircolorChoice.getAttribute('data-id');

				for(let pict of allPictNewGame){
					removeClass(pict,'hide');
					if(genderChoice !== null && pict.getAttribute('data-gender') !== genderChoice)
						addClass(pict,'hide');
					if(haircolorChoice !== null && pict.getAttribute('data-hair') !== haircolorChoice)
						addClass(pict,'hide');
				}
				sliderClick();
			}
			function sliderClick(index){
				let allPictNewGame = getId('slidersFace').querySelectorAll('img');
				if(allPictNewGame.length > 0){
					let listAvailable = [];
					for(let pict of allPictNewGame){
						emptyClass(pict,['selected','next','next2','previous','previous2']);
						if(haveClass(pict,'hide'))
							continue;
						listAvailable.push(parseInt(pict.getAttribute('data-index')));
						pict.onclick = function(){
							let indexHere = this.getAttribute('data-index');
							sliderClick(parseInt(indexHere));
						};
					}

					let findIndex = 0;
					if(index !== undefined)
						findIndex = listAvailable.indexOf(index);
					let next = listAvailable[(findIndex + 1 > listAvailable.length-1 ? (findIndex + 1) - listAvailable.length : findIndex + 1)];
					let next2 = listAvailable[(findIndex + 2 > listAvailable.length-1 ? (findIndex + 2) - listAvailable.length : findIndex + 2)];
					let previous = listAvailable[(findIndex-1 < 0  ? listAvailable.length + findIndex-1 : findIndex-1)];
					let previous2 = listAvailable[(findIndex-2 < 0 ? listAvailable.length + findIndex-2 : findIndex-2)];

					addClass(allPictNewGame[listAvailable[findIndex]],'selected');
					if(allPictNewGame[next] !== undefined && listAvailable.length > 1)
						addClass(allPictNewGame[next],'next');
					if(allPictNewGame[next2] !== undefined && listAvailable.length > 3)
						addClass(allPictNewGame[next2],'next2');
					if(allPictNewGame[previous] !== undefined && listAvailable.length > 2)
						addClass(allPictNewGame[previous],'previous');
					if(allPictNewGame[previous2] !== undefined && listAvailable.length > 4)
						addClass(allPictNewGame[previous2],'previous2');
					getId('slidersFaceContainer').querySelector('.icon-goon').onclick = function(){sliderClick(next);};
					getId('slidersFaceContainer').querySelector('.icon-goback').onclick = function(){sliderClick(previous);};

					//Highlight
					if(getId('haircolorField').querySelector('.selected') === null){
						let infoHairChoose = allPictNewGame[listAvailable[findIndex]].getAttribute('data-hair');
						let pictHair = getId('haircolorField').querySelectorAll('img');
						for(let pict of pictHair){
							removeClass(pict,'highlight');
							if(pict.getAttribute('data-id') == infoHairChoose){
								addClass(pict,'highlight');
							}
						}
					}
					if(getId('genderField').querySelector('.selected') === null){
						let infoGenderChoose = allPictNewGame[listAvailable[findIndex]].getAttribute('data-gender');
						let pictGender = getId('genderField').querySelectorAll('img');
						for(let pict of pictGender){
							removeClass(pict,'highlight');
							if(pict.getAttribute('data-id') == infoGenderChoose){
								addClass(pict,'highlight');
							}
						}
					}

					checkPerkImg();
				}
			}
			let faceList = [];
			for(let modelId of archetypeAvailables){
				let model = window.database.participants[modelId];
				faceList.push('<img src="'+model.picts.base+'" data-id="'+modelId+'" data-index="'+faceList.length+'" data-hair="'+model.hairColor+'" data-gender="woman" data-type="'+model.typeBody+'">');
			}
			for(let typeSkin in window.database.creation.body){
				for(let hairColor in window.database.creation.body[typeSkin].menProfile){
					if(hairColors.indexOf(hairColor) === -1)
						continue;
					for(let modelId in window.database.creation.body[typeSkin].menProfile[hairColor]){
						let imgPict = window.database.creation.body[typeSkin].menProfile[hairColor][modelId];
						faceList.push('<img src="'+imgPict+'" data-id="man-'+typeSkin+'-'+hairColor+'-'+modelId+'" data-index="'+faceList.length+'" data-hair="'+hairColor+'" data-gender="man" data-type="man">');
					}
				}
			}
			getId('slidersFace').innerHTML = faceList.join('');
			sliderClick();

		//Perks
			getId('perksFieldName').innerHTML = getTrad('newgame.perks',{'nbperks':window.database.creation.perksMax});
			let perksAvailable = window.database.creation.perksAvailable;
			contentToInsert = [];
			for(let perk of perksAvailable){
				let infoPerk = window.database.perks[perk];
				contentToInsert.push('<div class="perks" data-id="'+perk+'">'+
										'<div class="perkPict">'+
										(infoPerk.pictman !== undefined ? '<img class="perkMan hide" src="'+infoPerk.pictman+'"><img class="perkWoman" src="'+infoPerk.pictwoman+'">' : '<img src="'+infoPerk.pict+'">' )+
										'</div>'+
										'<div class="perkText">'+
											'<b>'+getTrad('perks.'+perk+'.name')+'</b><hr>'+getTrad('perks.'+perk+'.descstart')+
											(setting('perksinfluence') !== undefined && setting('perksinfluence') ? '<br><i>'+getTrad('perks.'+perk+'.effect')+'</i>' : '')+
										'</div>'+
									'</div>');
			}
			getId('perksField').innerHTML = contentToInsert.join('');
			let checkboxPerks = getId('perksField').querySelectorAll('.perks');
			checkboxPerks.forEach(function(element){
				element.onclick = function(e){
					if(!haveClass(this,'disabled')){
						toggleClass(this,'selected');
						let checkboxPerks = getId('perksField').querySelectorAll('.perks');
						let nbChecked = 0;
						for(let elem of checkboxPerks){
							removeClass(elem,'disabled');
							if(haveClass(elem,'selected'))
								nbChecked++;
						}
						getId('skipPrologue').setAttribute('disabled','disabled');
						getId('startNewGame').querySelector('.changeStep').setAttribute('disabled','disabled');
						if(nbChecked >= window.database.creation.perksMax){
							for(let elem of checkboxPerks){
								if(!haveClass(elem,'selected')){
									addClass(elem,'disabled');
								}
							}
							if(getId('slidersFace').querySelector('.selected') !== null){
								getId('skipPrologue').removeAttribute('disabled');
								getId('startNewGame').querySelector('.changeStep').removeAttribute('disabled');
							}
						}
					}
				};
			});

		//Housemate
			getId('housematesFieldName').innerHTML = getTrad('newgame.housemates');

			let behaviorsOption = [];
			for(let behaviorId in window.database.behaviors){
				if(behaviorId == 'default')
					continue;
				behaviorsOption.push('<option value="'+behaviorId+'">'+getTrad('behaviors.'+behaviorId+'.name')+'</option>');
			}

			contentToInsert = [];
			for(let nbHousemate = 0; nbHousemate < window.database.creation.nbParticipants-1; nbHousemate++){
				contentToInsert.push('<div class="housemate" data-id="'+nbHousemate+'">'+
										'<div class="housematePict">'+
											'<img id="housematePict_'+nbHousemate+'" data-value="random" src="data/img/characters/other/woman_default.jpg">'+
										'</div>'+
										'<div class="housemateSelect">'+
											'<select id="housemateSelect_'+nbHousemate+'">'+
												'<option value="random">'+ucfirst(getTrad('basic.random'))+'</option>'+
												behaviorsOption.join('')+
											'</select>'+
										'</div>'+
									'</div>');
			}
			getId('housematesField').innerHTML = contentToInsert.join('');
			let chooseHousemates = getId('housematesField').querySelectorAll('img');
			chooseHousemates.forEach(function(element){
				element.onclick = function(e){
					let archetypeAvailables = archetypeDispo();
					let modelList = [];
					modelList.push('<div class="model" data-id="random">'+
											'<img src="data/img/characters/other/woman_default.jpg"><br>'+
											'<span>'+ucfirst(getTrad('basic.random'))+'</span>'+
										'</div>');
					for(let modelId of archetypeAvailables){
						let model = window.database.participants[modelId];
						modelList.push('<div class="model" data-id="'+modelId+'">'+
											'<img src="'+model.picts.base+'"><br>'+
											'<span>'+model.name+'</span>'+
										'</div>');
					}

					let idHere = this.closest('.housemate').getAttribute('data-id');
					let infoPopup = '<div id="chooseHousemate" data-id="'+idHere+'"><h1>'+getTrad('newgame.choosemodel')+'</h1><div class="listModels">'+modelList.join('')+'</div></div>';
					showPopup(infoPopup,'centeredPopup');

					let chooseModels = getId('popup').querySelectorAll('.listModels .model');
					chooseModels.forEach(function(element){
						element.onclick = function(e){
							let idHere = getId('chooseHousemate').getAttribute('data-id');
							let modelId = this.getAttribute('data-id');
							if(modelId == 'random'){
								getId('housematePict_'+idHere).src = 'data/img/characters/other/woman_default.jpg';
								getId('housematePict_'+idHere).setAttribute('data-value','random');
							}else{
								let model = window.database.participants[modelId];
								getId('housematePict_'+idHere).src = model.picts.base;
								getId('housematePict_'+idHere).setAttribute('data-value',modelId);
							}
						}
					});
				}
			});

		//Additional Control
			getId('refreshName').onclick = function(){
				let currentGender = getId('genderField').querySelector('.selected');
				if(currentGender == null)
					currentGender = getId('genderField').querySelector('.highlight');
				currentGender = currentGender.getAttribute('data-id');

				let namesList = null;
				let value = null;
				if(currentGender == 'man')
					namesList = clone(window.database.characterInfo.maleNames);
				else
					namesList = clone(window.database.characterInfo.femaleNames);
				value = pickRandom(namesList);
				getId('firstnameField').value = value;

				namesList = clone(window.database.characterInfo.lastNames);
				value = pickRandom(namesList);
				getId('lastnameField').value = value;
			};
			getId('newgame-hardcore').onclick = function(){
				toggleClass(this,'icon-toggleOnR');
				toggleClass(this,'icon-toggleOffR');
			};
			getId('newgame-endless').onclick = function(){
				toggleClass(this,'icon-toggleOnR');
				toggleClass(this,'icon-toggleOffR');
			};

			if(setting('crazyworld') == 'all'){
				removeClass(getId('modCrazyWorld'),'hide');
				getId('newgame-crazyworld').onclick = function(){
					toggleClass(this,'icon-toggleOnR');
					toggleClass(this,'icon-toggleOffR');
				};
			}else{
				addClass(getId('modCrazyWorld'),'hide');
				removeClass(getId('newgame-crazyworld'),'icon-toggleOnR');
				addClass(getId('newgame-crazyworld'),'icon-toggleOffR');
			}

		for(let elem of getId('main-newGame').querySelectorAll('.finishCreation')){
			elem.onclick = function(){
				startGamePage();
			}
		}
		getId('skipPrologue').onclick = function(){
			try{
				//Reset the game
				cleanStorage();
				setStorage('dayNumber',1);

				initNewGame();
				startGamePage();			
			}catch(error){
				console.log('error6',error);
				showError(error);
				let from = getStorage('currentPage');
				showPage(from,'main-menu');
			}
		}
	}

	function btnStepControl(elem){

		let errors = [];
		let previousPage = elem.getAttribute('data-current');
		let currentPage = elem.getAttribute('data-other');
		switch(previousPage){
			case 'startNewGame':
				//Verify data
				if(getId('haircolorField').value == ''){
					errors.push(getTrad('errors.newgamehaircolor'));
					break;
				}

				//Check if the hair color + gender have a participant available
				if(getId('genderField').value == 'man'){
					//TODO
				}

				//Reset the game
				cleanStorage();
				setStorage('dayNumber',1);

				initNewGame();

				//Build the Pict Prologue Page
				let player = getCharacter('player');
				let characterSec = getStorage('characterSec');
				if(player.wasMan)
					getId('facePlayer').src = player.get('pictMan');
				else
					getId('facePlayer').src = player.getFace('base');

				let villa = getStorage('villa');
				getId('villaPict1').src = villa.advertsPict[0];
				getId('villaPict2').src = villa.advertsPict[1];
				getId('villaPict3').src = villa.advertsPict[2];
				getId('villaPict4').src = villa.advertsPict[0];
				getId('villaPict5').src = villa.advertsPict[2];
				getId('villaPict6').src = villa.bedrooms.player.pict;
				getId('villaPictLivingroom').src = villa.locations.livingroom.pict;
				getId('villaPictBedroom').src = villa.bedrooms.player.pict;

				if(player.havePerk('crazyworld')){
					for(let elem of getId('main-newGame').querySelectorAll('.villaBtnFinalCrazyworld')){
						removeClass(elem,'hide');
					}

					//Page7
						let crazyContent = [];
						if(player.wasMan)
							crazyContent.push('<div class="justifyContent">'+getTrad('newgame.page7.line1male')+'</div>');
						else
							crazyContent.push('<div class="justifyContent">'+getTrad('newgame.page7.line1female')+'</div>');

						crazyContent.push('<div class="discussLine">'+discuss('data/img/hypno/eyesHypno.mp4','?????',getTrad('newgame.page7.eye1'))+'</div>');
						let hypnoBimbos = pickRandom(clone(window.database.hypnoTypes.bimbo.vids),3);
						let hypnoSluts = pickRandom(clone(window.database.hypnoTypes.slut.vids),3);
						for(let i=0;i<1;i++){
							crazyContent.push('<div class="centerContent">'+imgVideo(hypnoBimbos[i])+'</div>');
							crazyContent.push('<div class="centerContent">'+imgVideo(hypnoSluts[i])+'</div>');
						}
						crazyContent.push('<div class="discussLine">'+discuss('data/img/hypno/eyesHypno.mp4','?????',getTrad('newgame.page7.eye2'))+'</div>');
						for(let i=1;i<2;i++){
							crazyContent.push('<div class="centerContent">'+imgVideo(hypnoBimbos[i])+'</div>');
							crazyContent.push('<div class="centerContent">'+imgVideo(hypnoSluts[i])+'</div>');
						}
						crazyContent.push('<div class="discussLine">'+discuss('data/img/hypno/eyesHypno.mp4','?????',getTrad('newgame.page7.eye3'))+'</div>');
						for(let i=2;i<3;i++){
							crazyContent.push('<div class="centerContent">'+imgVideo(hypnoBimbos[i])+'</div>');
							crazyContent.push('<div class="centerContent">'+imgVideo(hypnoSluts[i])+'</div>');
						}
						getId('crazyWorldHypnoStart1').innerHTML = crazyContent.join('');

					//Page8
						crazyContent = [];

						if(player.wasMan){
							crazyContent.push('<div id="villaTransformation2" class="bodyShow centerContent"></div>');
						}

						crazyContent.push('<div id="startContainerPage8">');
						crazyContent.push('<div class="centerContent dizzyText">'+getTrad('newgame.page8.line1')+'</div>');
						crazyContent.push('<div class="discussLine dizzyText">'+discuss(player.getFace(),player.getName(),getTrad('newgame.page8.player1'))+'</div>');
						crazyContent.push('<div class="centerContent">'+getTrad('newgame.page8.line2')+'</div>');
						crazyContent.push('<div class="discussLine">'+discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page8.ai1'))+'</div>');
						crazyContent.push('<div class="centerContent">'+getTrad('newgame.page8.line2b')+'</div>');
						crazyContent.push('<div class="discussLine">'+discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].upset)),characterSec.ia.name,getTrad('newgame.page8.ai2'))+'</div>');
						crazyContent.push('</div><br class="clear">');

						if(player.wasMan){
							crazyContent.push('<div class="centerContent">'+getTrad('newgame.page8.line3man')+'</div>');
							crazyContent.push('<div class="discussLine">'+discuss(player.getFace(),player.getName(),getTrad('newgame.page8.player2man'))+'</div>');
							crazyContent.push('<div class="centerContent">'+imgVideo('data/img/other/start/suckingFinger.jpg')+'</div>');
							crazyContent.push('<div class="centerContent">'+getTrad('newgame.page8.line4man')+'</div>');
						}else{
							crazyContent.push('<div class="centerContent">'+imgVideo('data/img/other/start/suckingFinger.jpg')+'</div>');
							crazyContent.push('<div class="justifyContent">'+getTrad('newgame.page8.line3woman')+'</div>');
						}
						crazyContent.push('<div class="discussLine">'+discuss('data/img/hypno/eyesHypno.mp4','?????',getTrad('newgame.page8.eye1'))+'</div>');
						let hypnoBimbo = pickRandom(clone(window.database.hypnoTypes.bimbo.vids));
						crazyContent.push('<div class="centerContent">'+imgVideo(hypnoBimbo)+'</div>');

						getId('crazyWorldHypnoStart2').innerHTML = crazyContent.join('');

						if(player.wasMan){
							getId('startContainerPage8').style.width = 'calc(100% - 230px)';
							getId('startContainerPage8').style.float = 'right';
							
							let tmpCheck = player.sizeBoobs.split('_');
							let pictsBoobsList = player.picturesTypes('topCloth');
							let pictsBottomsList = player.picturesTypes('bottomCloth');

							let transfo = [];
							transfo.push(getTransfo(player.starting.face,player.getFace()));
							transfo.push(getTransfo(player.starting.torsoPict,pictsBoobsList[pictsBoobsList.length -1]));
							transfo.push(getTransfo(player.starting.bottomPict,pictsBottomsList[pictsBottomsList.length -1]));
							getId('villaTransformation2').innerHTML = transfo.join('');
						}

					//Page9
						crazyContent = [];

						if(player.wasMan){
							crazyContent.push('<div class="justifyContent">'+getTrad('newgame.page9.line1man')+'</div>');
						}else{
							crazyContent.push('<div class="justifyContent">'+getTrad('newgame.page9.line1woman')+'</div>');
						}
						crazyContent.push('<div class="discussLine">'+discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page9.ai1'))+'</div>');
						crazyContent.push('<div class="discussLine">'+discuss(player.getFace(),player.getName(),getTrad('newgame.page9.player1',player))+'</div>');
						crazyContent.push('<div class="discussLine">'+discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].upset)),characterSec.ia.name,getTrad('newgame.page9.ai2'))+'</div>');
						crazyContent.push('<div class="centerContent">'+imgVideo('data/img/other/start/suckingFinger.jpg')+'</div>');
						crazyContent.push('<div class="centerContent">'+getTrad('newgame.page9.line2')+'</div>');
						crazyContent.push('<div class="discussLine">'+discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page9.ai3'))+'</div>');

						let housemates = getHousemateId('all');
						for(let housemateId of housemates){
							let housemate = getCharacter(housemateId);
							let prez = housemate.previousProfile[0].testimonial;
							prez = prez.replace('</p>','<br>').replace('<p>','');
							crazyContent.push(discuss(housemate.getFace(),housemate.getName(),prez));
						}
						crazyContent.push('<div class="justifyContent">'+getTrad('newgame.page9.line3')+'</div>');
						crazyContent.push(discuss(player.getFace(),player.getName(),getTrad('newgame.page9.prezplayer',player)));
						crazyContent.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page9.ai4',player)));
						if(player.wasMan){
							crazyContent.push(discuss(player.getFace(),player.getName(),getTrad('newgame.page9.prezplayerm',player)));
							crazyContent.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('newgame.page9.aipresentation3m',player)));
							crazyContent.push(discuss(player.getFace('out'),player.getName(),getTrad('newgame.page9.prezplayer2m',player)));
						}else{
							crazyContent.push(discuss(player.getFace('out'),player.getName(),getTrad('newgame.page9.prezplayerw',player)));
						}
						crazyContent.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('newgame.page9.ai5',player)));
						crazyContent.push('<div class="justifyContent">'+getTrad('newgame.page9.line4')+'</div>');

						getId('crazyWorldHypnoStart3').innerHTML = crazyContent.join('');

						getId('villaPictLivingroom2').src = villa.locations.livingroom.pict;
						getId('villaPict6b').src = villa.bedrooms.player.pict;

					renderStuff();

				}else{
					for(let elem of getId('main-newGame').querySelectorAll('.villaBtnFinalWoman')){
						if(!player.wasMan){
							removeClass(elem,'hide');
						}else{
							addClass(elem,'hide');
						}
					}
					for(let elem of getId('main-newGame').querySelectorAll('.villaBtnFinalMan')){
						if(player.wasMan){
							removeClass(elem,'hide');
						}else{
							addClass(elem,'hide');
						}
					}

					if(player.wasMan){
						let tmpCheck = player.sizeBoobs.split('_');
						let pictsBoobsList = player.picturesTypes('topCloth');
						let pictsBottomsList = player.picturesTypes('bottomCloth');

						let transfo = [];
						transfo.push(getTransfo(player.starting.face,window.database.participants[player.archetype].picts.base));
						transfo.push(getTransfo(player.starting.torsoPict,pictsBoobsList[pictsBoobsList.length -1]));
						transfo.push(getTransfo(player.starting.bottomPict,pictsBottomsList[pictsBottomsList.length -1]));
						getId('villaTransformation').innerHTML = transfo.join('');
					}

					let presentationAll = [];
					presentationAll.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('newgame.page6.aipresentation2',player)));
					let housemates = getHousemateId('all');
					for(let housemateId of housemates){
						let housemate = getCharacter(housemateId);
						let prez = housemate.previousProfile[0].testimonial;
						prez = prez.replace('</p>','<br>').replace('<p>','');
						presentationAll.push(discuss(housemate.pict,housemate.getName(),prez));
					}
					presentationAll.push('<div class="justifyContent">'+getTrad('newgame.page6.line3')+'</div>');
					if(player.wasMan){
						presentationAll.push(discuss(player.pict,player.getName(),getTrad('newgame.page6.prezplayerm',player)));
						presentationAll.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('newgame.page6.aipresentation3m',player)));
						presentationAll.push(discuss(player.pict,player.getName(),getTrad('newgame.page6.prezplayer2m',player)));
					}else{
						presentationAll.push(discuss(player.pict,player.getName(),getTrad('newgame.page6.prezplayerw',player)));
					}
					getId('villaPresentationAll').innerHTML = presentationAll.join('');
				}


				//Build the Text Prologue Page
				let elemsToChange = {
					'firstNamePlayer': (player.wasMan ? player.get('firstnameMan') : player.get('firstname')),
					'lastNamePlayer':player.get('lastname'),
					'jobPlayer':getTrad('jobs.'+player.trueJob+'.full'),
					'formalPlayer': (player.wasMan ? player.getFormal('man') : player.getFormal()),
					'nbParticipantText':getTrad('newgame.nbparticipantstext')
				};
				for(let elemId in elemsToChange){
					let list = getId('main-newGame').querySelectorAll('.'+elemId);
					for(let e of list){
						e.innerHTML = elemsToChange[elemId];
					}
				}

				getId('villaAIPresentation').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page4.aipresentation',player));
				getId('villaAIPresentation2').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page4.aipresentation2',player));
				getId('villaAIPresentation3').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('newgame.page4.aipresentation3',player));
				getId('villaAIPresentation4').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('newgame.page5.aipresentation',player));
				getId('villaAIPresentation5').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page5.aipresentation2',player));
				getId('villaRealisation1').innerHTML = discuss(player.get('pict'),player.getName(),getTrad('newgame.page5.realization1',player));
				getId('villaAIPresentation6').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('newgame.page5.aipresentation3',player));
				getId('villaRealisation2').innerHTML = discuss(player.get('pict'),player.getName(),getTrad('newgame.page5.realization2',player));
				getId('villaAIPresentation7').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page5.aipresentation4',player));
				getId('villaRealisation3').innerHTML = discuss(player.get('pict'),player.getName(),getTrad('newgame.page5.realization3',player));
				getId('villaAIPresentation8').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('newgame.page5.aipresentation5',player));
				getId('villaRealisation4').innerHTML = discuss(player.get('pict'),player.getName(),getTrad('newgame.page5.realization4',player));

				getId('villaAIPresentation9m').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page6.aipresentationm',player));
				getId('villaAIPresentation9w').innerHTML = discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('newgame.page6.aipresentationw',player));

				break;
		}

		if(errors.length > 0){
			getId(previousPage).querySelector('.newgameError').innerHTML = errors.join('<br>');
			toggleClass(getId(currentPage),'hide');
			toggleClass(getId(previousPage),'hide');
		}
	}

	function initNewGame(){
		//Set the difficulty
		let difficultyChoosed = getId('difficultyField').querySelector('.selected');
		if(difficultyChoosed == null)
			difficultyChoosed = getId('difficultyField').querySelector('.highlight');
		difficultyChoosed = difficultyChoosed.getAttribute('data-id');
		setStorage('difficulty',difficultyChoosed);
		deleteStorage('characters');

		manageFans();

		let archetypeChoosed = getId('slidersFace').querySelector('.selected').getAttribute('data-id');

		//Create the Player
		let perksChoosed = [];
		let checkboxPerks = getId('perksField').querySelectorAll('.selected');
		for(let elem of checkboxPerks){
			perksChoosed.push(elem.getAttribute('data-id'));
		}

		if( (setting('crazyworld') == 'octokuro' && archetypeChoosed == 'octokuro') || haveClass(getId('newgame-crazyworld'),'icon-toggleOnR') ){
			perksChoosed.push('crazyworld');
		}

		let hairColor = 'colored';
		if(getId('haircolorField').querySelector('.selected') !== null)
			hairColor = getId('haircolorField').querySelector('.selected').getAttribute('data-id');
		else if(getId('haircolorField').querySelector('.highlight') !== null)
			hairColor = getId('haircolorField').querySelector('.highlight').getAttribute('data-id');
		
		let params = {
			'idChar':'player',
			'gender':(getId('genderField').querySelector('.selected') !== null ? getId('genderField').querySelector('.selected').getAttribute('data-id') : getId('genderField').querySelector('.highlight').getAttribute('data-id')),
			'hairColor':hairColor,
			'firstname':getId('firstnameField').value,
			'lastname':getId('lastnameField').value,
			'perks':perksChoosed,
			'archetype':archetypeChoosed
		};
		let player = new Character(params);

		//Create Housemates
		findHousemates();		//Create Char , Behavior, etc...
		defineSchedule();
		for(let charId of getHousemateId('all')){
			getCharacter(charId).saveProfile();
		}

		//Finish Player
		player = getCharacter('player');
		player.finishSetUp();

		//Add Mod
		player.mod = {
						'hardcore':haveClass(getId('newgame-hardcore'),'icon-toggleOnR'),
						'endless':haveClass(getId('newgame-endless'),'icon-toggleOnR'),
					};
		if(player.mod.hardcore){		//Name the Hardcore Save
			let saves = getStorage('saves');
			let lastHCSave = null;
			for(let saveId in saves){
				if(saves[saveId].name.indexOf('Hardcore') !== -1)
					lastHCSave = saveId;
			}
			let numHC = 1;
			if(lastHCSave !== null)
				numHC = (parseInt(lastHCSave.replace('Hardcore-',''))+1);
			player.mod.hardcoreSaveName = 'Hardcore-'+ numHC;
		}
		player.save();

		//Assign Bedrooms
		let bedroomsPicts = window.database.bedrooms;
		let characters = getStorage('characters');
		let listCharId = Object.keys(characters);
		let bedPictKept = pickRandom(bedroomsPicts,listCharId.length);
		for(let i in bedPictKept){
			let character = getCharacter(listCharId[i]);
			character.set('bedroom',bedPictKept[i]);
		}

		//Choose the Villa
		buildVilla();

		//Set up the Start Cooldown of Events
		let eventsCooldown = {};
		for(let eventId in window.database.events){
			let event = window.database.events[eventId];
			if(event.startingcooldown !== undefined && event.startingcooldown > 0)
				eventsCooldown[eventId] = event.startingcooldown;
		}
		setStorage('eventsCooldown',eventsCooldown);
	}

	function buildVilla(){
		let dataVillas = window.database.villa;
		let villaId = pickRandom(Object.keys(dataVillas));

		//Define Bedrooms
		let bedrooms = {};
		let housemates = Object.keys(getStorage('characters'));
		let imgBedrooms = pickRandom(window.database.bedrooms,housemates.length);
		for(let i in housemates){
			let housemateId = housemates[i];
			bedrooms[housemateId] = {
				'owner':housemateId,
				'pict':imgBedrooms[i],
				'type':'bedroom',
				'activities':window.database.locations.bedroom.activities
			};
		}

		//Define Locations
		let locations = {};
		let locationsAvailable = window.database.locations;
		for(let locaId in locationsAvailable){

			if(locaId == 'bedroom')
				continue;

			let picts = dataVillas[villaId].locationsPics[locaId];
			locations[locaId] = {
				'pict':pickRandom(picts),
				'type':locaId,
				'activities':locationsAvailable[locaId].activities
			};
		}

		let villa = {
			'version':window.database.version,
			'id':villaId,
			'hallway':pickRandom(window.database.hallways),
			'pool':pickRandom(dataVillas[villaId].locationsPics.pool),
			'advertsPict':dataVillas[villaId].advertsPict,
			'bedrooms':bedrooms,
			'locations':locations
		};
		setStorage('villa',villa);

		//Define Secondary Characters
		defineCharacterSecondary();
	}

	function defineCharacterSecondary(){		//Generate info for the secondary Characters
		let charSec = {};
		for(let charId in window.database.characterSec){
			let infoChar = window.database.characterSec[charId];

			let appreciation = random(window.database.difficulty[getStorage('difficulty')].appreciationBase);
			if(infoChar.appreciationBoost !== undefined)
				appreciation = Math.min(100,appreciation + infoChar.appreciationBoost);

			let name = '';
			if (infoChar.realnamePrefix !== undefined){
				let resName = giveNewName(infoChar.gender);
				name = infoChar.realnamePrefix+' '+resName.full;
			}else{
				name = (Array.isArray(infoChar.name) ? pickRandom(infoChar.name) : infoChar.name);
			}

			charSec[charId] = {
				'name':name,
				'set':pickRandom(Object.keys(infoChar.set)),
				'appreciation':appreciation,
				'info':{
					'seen':(charId == 'ia' ? true : false)
				}
			};
		}
		setStorage('characterSec',charSec);
	}

	function defineSchedule(){					//Assign the activity of HouseMate
		let housematesId = getHousemateId();
		let actionsList = clone(window.database.actions);
		let actionsListId = Object.keys(actionsList);
		actionsListId = arrayShuffle(actionsListId);					//Random the order
		let actionNotNight = window.database.actionNotNight;
		let difficultyInfo = window.database.difficulty[getStorage('difficulty')];

		let dayTime = getDayTimeList();
		let mainIteration = 0;

		let notOk = true;
		while(mainIteration < 10 && notOk){								//If one time fail try again
			let housemateActivity = {};
			let actionUsed = [];
			notOk = false;
			for(let timeId in dayTime){										//Process dayTime

				//Pick randomly the actions
				let actionAvailable = [];
				let activityUsed = [];
				let roomUsed = [];
				actionsListId = arrayDiff(actionsListId,actionUsed);		//Don't reuse action
				for(let actionId of actionsListId){
					if(timeId == 'night' && actionNotNight.indexOf(actionId) !== -1)
						continue;
					if(activityUsed.indexOf(actionsList[actionId].activity) !== -1)
						continue;
					if(roomUsed.indexOf(actionsList[actionId].location) !== -1)		//Not in the same room
						continue;

					roomUsed.push(actionsList[actionId].location);
					activityUsed.push(actionsList[actionId].activity);
					actionAvailable.push(actionId);
				}

				let houseCanPick = {};
				let houseCanPickNumber = {};
				for(let charId of housematesId){
					let character = getCharacter(charId);
					if(housemateActivity[charId] === undefined)
						housemateActivity[charId] = {};
					if(houseCanPick[charId] === undefined){
						houseCanPick[charId] = [];
						houseCanPickNumber[charId] = 0;
					}

					let actionToPick = arrayShuffle(actionAvailable);
					for(let actionId of actionToPick){
						let activityId = actionsList[actionId].activity;
						//If already doing that activity previously => Skip
						if(housemateActivity[charId][activityId] !== undefined)
							continue;

						//If no Picture set, don't choose it
						if(window.database.participants[character.archetype].activities[activityId] === undefined||window.database.participants[character.archetype].activities[activityId].length == 0)
							continue;
						
						houseCanPick[charId].push(actionId);
						houseCanPickNumber[charId]++;
					}
				}

				let assoc = {};
				let iteration = 0;
				while(iteration < 10 && Object.keys(assoc).length < (window.database.creation.nbParticipants - 1)){	//Fleme to fix the issue
					assoc = {};
					let sortHouseId = arrayAssocSort(houseCanPickNumber);
					for(let charId of sortHouseId){
						let newAvail = arrayDiff(houseCanPick[charId],actionUsed);
						if(newAvail.length > 0){
							let actionId = pickRandom(newAvail);
							let activityId = actionsList[actionId].activity;
							housemateActivity[charId][activityId] = true;
							getCharacter(charId).addSchedule(timeId,actionId);
							assoc[charId] = actionId;
							actionAvailable.splice(actionAvailable.indexOf(actionId),1);
							actionUsed.push(actionId);
						}
					}
					iteration++;
				}
				console.log(timeId+' it: '+iteration+' Schedule:',assoc);
				mainIteration++;
				if(iteration >= 10)
					notOk = true;
			}
		}
	}
	function findHousemates(){
		let player = getCharacter('player');
		let participants = window.database.participants;
		let nbParticipants = window.database.creation.nbParticipants-1;

		//Archetype
			//Get if already choosed
			let housemateChoosed = [];
			let modelUsed = [];
			let behaviorUsed = [];
			let modelToPick = 0;
			let behaviorToPick = 0;
			let housemateSelections = getId('housematesField').querySelectorAll('.housemate');
			for(let housemate of housemateSelections){
				let housemateId = housemate.getAttribute('data-id');
				let housemateModel  = getId('housematePict_'+housemateId).getAttribute('data-value');
				let housemateBehavior  = getId('housemateSelect_'+housemateId).value;
				housemateChoosed.push({'idChar':housemateModel, 'archetype':housemateModel,'behavior':housemateBehavior});

				if(housemateModel !== 'random')
					modelUsed.push(housemateModel);
				else
					modelToPick++;

				if(housemateBehavior !== 'random')
					behaviorUsed.push(housemateBehavior);
				else
					behaviorToPick++;
			}

			let archetypeAvailables = archetypeDispo();
			let archetypeHousemates = {};
			for(let participantId in participants){
				let participant = participants[participantId];

				if(archetypeAvailables.indexOf(participantId) === -1)
					continue;

				//If already used
				if(modelUsed.indexOf(participantId) !== -1)
					continue;

				//Dont use the player archetype
				if(player.get('archetype') == participantId)
					continue;

				let key = participant.hairColor+'_'+participant.typeBody;
				if(archetypeHousemates[key] === undefined)
					archetypeHousemates[key] = [];

				archetypeHousemates[key].push(participantId);
			}

			let archetypeChoosed = [];
			if(modelToPick > 0){
				let keysPicked = pickRandom(Object.keys(archetypeHousemates),modelToPick);
				for(let key of keysPicked){
					archetypeChoosed.push(pickRandom(archetypeHousemates[key]));
				}
			}

		//Behavior
			let behaviorsData = window.database.behaviors;
			let listBehaviorId = Object.keys(behaviorsData);
			let findDefault = listBehaviorId.indexOf('default');
			if(findDefault !== -1)
				listBehaviorId.splice(findDefault,1);

			//Sort by Hypno type
			let sortedBehavior = {};
			for(let behaviorId of listBehaviorId){

				//If already used
				if(behaviorUsed.indexOf(behaviorId) !== -1)
					continue;

				let info = behaviorsData[behaviorId];
				if(sortedBehavior[info.hypno] === undefined)
					sortedBehavior[info.hypno] = [];
				sortedBehavior[info.hypno].push(behaviorId);
			}
			let behaviorsKept = [];
			//Pick at least one of each
			for(let hypnoType in sortedBehavior){
				behaviorsKept.push(pickRandom(sortedBehavior[hypnoType]));
			}
			//Pick the rest randomly
			if(nbParticipants > behaviorsKept.length){
				listBehaviorId = arrayDiff(listBehaviorId,behaviorsKept);
				behaviorsKept = [...behaviorsKept,...pickRandom(listBehaviorId,(nbParticipants-3))];
			}

		//Prepare creation
		for(let params of housemateChoosed){
			if(params.idChar == 'random'){
				let pick = archetypeChoosed.splice(0,1);
				params.idChar = pick[0];
				params.archetype = pick[0];
			}

			if(params.behavior == 'random'){
				params.behavior = behaviorsKept.splice(0,1);
			}
			new Character(params);
		}
	}

	function startGamePage(){
		setStorage('gameState',{
			'actionType':null,
			'location':'bedroom.player',
			'dayNumber':1,
			'time':'morning',
			'info':{}
		});
		retrieveContent();
	}

/********** GAME LOOPS *******/
	/*
		gameState:
			actionType => What the player is doing
			location => Where the player is
			dayNumber => What the day is
			time => What time is it
			previousTime => What time we were at the start of this cycle
			cameraUsed => If Today the player has already went to the Camera Room
			info => Additionnal Information (eventId, DailyPart, etc...)
	*/
	function gameControl(params){						//Change the gameState according to the params
		try {
			let gameStateCurrent = getStorage('gameState');
			let newGameState = clone(gameStateCurrent);
			let player = getCharacter('player');

			if(params.type !== undefined){
				//Reset
				newGameState.actionType = null;
				newGameState.previousTime = null;
				newGameState.info = {};
				delete newGameState.trap;

				//Ditz Check
					if(player.ditzNumber >= 5){
						params.type = 'nextDay';
						newGameState.info.ditzTrigger = true;
						player.set('ditzNumber',0);
						player.add('slut',random(0,2));
						player.add('bimbo',random(2,5));
						player = getCharacter('player');
						manageDitzScreen();
					}

				if(params.type == 'navigation'){					//Move around
					clearSetMedia(); 								//Clear the previous set of media used
					if(['bedrooms','hallway'].indexOf(params.id) === -1){	//No Event between Rooms
						let infoEvent = testEvent(params);
						if(infoEvent.eventKept !== null){
							newGameState.actionType = 'event';
							newGameState.info = {...newGameState.info,...infoEvent};
						}
					}
					newGameState.info.destination = params.id;

					//If No Event the player move
					if(newGameState.actionType === undefined||newGameState.actionType == null){
						newGameState.location = params.id;
					}
				}else if(params.type == 'action'){
					//Test if Event or not
					let infoEvent = testEvent(params);
					if(infoEvent.eventKept !== null){
						newGameState.actionType = 'event';
						newGameState.info = {...newGameState.info,...infoEvent};
					}
					let locations = getLocationDoing();
					newGameState.info.destination = locations[params.id];

					if(newGameState.actionType === undefined||newGameState.actionType == null){
						newGameState.actionType = 'doAction';
						newGameState.info.activity = params.id;
						let activityId = params.id;
						if(params.id == 'cameraroom'){				//When the player go to the CameraRoom
							if(gameStateCurrent.cameraUsed && params.choose === undefined){		//If the player has been already inside the camera room today, do nothing
								newGameState.location = 'hallway';
							}else{
								let nextLocation = 'cameraroom';

								//Gain some Votes directly if no fan feature
								if(!setting('fanfeature')){
									newGameState.info.addVotes = player.addvotes('cameraroom');
								}else if(params.choose !== undefined){
									let infoPopup = null;
									if(params.choose == 'appeal'){	//Gain some Fans
										let camNewFans = window.database.difficulty[getStorage('difficulty')].camNewFans;
										let nbNewFans = player.add('fans',camNewFans,params.id);
										infoPopup = {'nbFans':nbNewFans};
									}else{							//Gain Votes
										infoPopup = player.addvotes('cameraroom');
									}

									//Show the popup
									popupVotes(infoPopup);

									//If it's the night play the nextDay
									if(gameStateCurrent.time == 'nextDay'){
										newGameState.location = 'hallway';
										newGameState.actionType = null;
										newGameState = doTheNextDay(params,newGameState);
									}else{
										newGameState.location = 'hallway';
										newGameState.actionType = null;
									}
								}

								if(params.choose === undefined){		//Play it once, when arrive in the room
									//Save Stats
									let soloHisto = clone(player.get('stats.soloActivity'));
									if(soloHisto[params.id] === undefined)
										soloHisto[params.id] = 0;
									soloHisto[params.id]++;
									player.set('stats.soloActivity',soloHisto);

									//Pass the time
									newGameState.previousTime = gameStateCurrent.time;
									newGameState.time = increaseTime();

									//Lock the CameraRoom for the day
									newGameState.cameraUsed = true;
									newGameState.location = 'cameraroom';
								}
							}
						}else if(params.id == 'meditationbook'){	//When the player use the meditation book
							if(player.get('slut') > 66 && (random(0,100) < (player.get('slut')-16)) ){														//Fail
								player.add('slut',3);
								player.add('bimbo',3);

								let funType = (player.doHave('sextoys')?'dildo':'manual');
								let typeMast = window.database.morning.masturbationType[player.get('sizeBoobs')];
								newGameState.info.meditationFail = 'slut';
								newGameState.info.funtimeId = pickRandom(giveMastList(funType,typeMast));

								newGameState.time = increaseTime();
							}

							let testBimbo = random(0,100);
							if(newGameState.info.meditationFail === undefined && player.get('bimbo') > 66 && (testBimbo < (player.get('bimbo')-16)) ){	//Fail
								newGameState.info.meditationFail = 'bimbo';
								newGameState.time = increaseTime(2);
							}

							if(newGameState.info.meditationFail === undefined){																				//Work
								if(player.perkLock === undefined||player.perkLock == null){
									let perksModel = window.database.participants[player.archetype].perks;
									player.addPerks(perksModel);
									player.perkLock = perksModel;
									player.save();
								}else{
									let perksModelDelete = player.perkLock.map(function(el) {return '-'+el;})
									player.addPerks(perksModelDelete);
									let perksModel = window.database.participants[player.archetype].perks;
									if(JSON.stringify(player.perkLock) != JSON.stringify(perksModel)){
										player.addPerks(perksModel);
										player.perkLock = perksModel;
										player.save();
									}else{
										player.perkLock = null;
										player.save();
									}
								}
								newGameState.time = increaseTime();
							}
						}else{
							let infoLocation = getLocationInfo(newGameState.location);
							let actions = clone(window.database.actions);
							if(actions[params.id] !== undefined)
								activityId = actions[params.id].activity;

							if(params.people !== undefined && params.people !== null){		//Interact with housemate
								newGameState.info.people = params.people;
								let participant = getCharacter(params.people);
								let actionId = participant.get('schedule')[newGameState.time].id;
								newGameState.info.action = actionId;

								let trapUsed = getStorage('trapUsed',[]);
								let haveTrap = (infoLocation.activities[params.id].trap !== undefined && infoLocation.activities[params.id].trap.indexOf(actionId) !== -1);

								let trapssystem = setting('trapssystem');
								let housemateTrigger = true;
								switch(trapssystem){
									case 'easier': 				 //If there is a Trap to deploy
										housemateTrigger = (haveTrap !== undefined && haveTrap);
										break;
									case 'prudent': 				 //If there is a Trap to deploy and not already used on the housemate
									case 'tricky':
										housemateTrigger = (haveTrap !== undefined && haveTrap && trapUsed.indexOf(actionId) === -1);
										break;
								}

								if(housemateTrigger){
									//If already out
									if(participant.get('out') !== undefined && participant.get('out'))
										newGameState.info.housemateOut = true;

									newGameState.info.trap = true;
									participant.addStage();

									//Stats
									player.set('stats.trapSuccess','++');
								}else{
									if(setting('fanfeature') && player.havePerk('nymphet')){		//If Nymphet have fans instead of Votes
										let infoVote = player.giveValueToAdd('addvotes','discuss',params.id);
										let nbNewFans = player.add('fans',Math.ceil(infoVote.numberCalc * 0.10));
										newGameState.info.addFans = {'nbFans':nbNewFans};
									}else{
										newGameState.info.addVotes = player.addvotes('discuss',params.id);
									}

									//If the trap is here but already used previously
									if(haveTrap)
										newGameState.info.trapFail = true;

									//Stats
										let participHisto = clone(player.get('stats.participateActivity'));
										if(participHisto[params.people] === undefined)
											participHisto[params.people] = {};
										if(participHisto[params.people][params.id] === undefined)
											participHisto[params.people][params.id] = 0;
										participHisto[params.people][params.id]++;
										player.set('stats.participateActivity',participHisto);
								}

								//Disable the used trap if triggered or prudent
								if(haveTrap && (trapssystem != 'tricky'||housemateTrigger)){
									villa = getStorage('villa');
									if(newGameState.location.indexOf('bedroom') !== -1){
										let tmpSplit = newGameState.location.split('.');
										villa.bedrooms[tmpSplit[1]].activities[params.id].trap.splice(infoLocation.activities[params.id].trap.indexOf(actionId),1);
									}else{
										villa.locations[newGameState.location].activities[params.id].trap.splice(infoLocation.activities[params.id].trap.indexOf(actionId),1);
									}
									setStorage('villa',villa);
									trapUsed.push(actionId);
									setStorage('trapUsed',trapUsed);
								}

								//Pass the time
								newGameState.previousTime = gameStateCurrent.time;
								newGameState.time = increaseTime();
							}else{
								newGameState.info.trap = false;
								if(actions[params.id] === undefined)		//If doing the activity
									newGameState.info.trap = (infoLocation.activities[activityId].trap !== undefined && infoLocation.activities[activityId].trap.length > 0);
								else											//If messing with stuff
									newGameState.info.trap = (infoLocation.activities[activityId].trap !== undefined && infoLocation.activities[activityId].trap.indexOf(params.id) !== -1);

								if(newGameState.info.trap !== undefined && newGameState.info.trap){			//If Trap
									newGameState.info.typeHypno = pickRandom(giveHypnoToUse());	//Choose a random hypno
									newGameState.info.strengthHypno = random(2,3);
									player.beHypno(newGameState.info.typeHypno,newGameState.info.strengthHypno);

									//Stats
									player.set('stats.trapYourself','++');

									//Disable the used trap
										villa = getStorage('villa');
										if(newGameState.location.indexOf('bedroom') !== -1){
											let tmpSplit = newGameState.location.split('.');
											villa.bedrooms[tmpSplit[1]].activities[activityId].trap = [];
										}else{
											villa.locations[newGameState.location].activities[activityId].trap = [];
										}
										setStorage('villa',villa);
								}else{
									if(actions[params.id] !== undefined){	//Interact with stuff
										if(actions[params.id].type == 'inventory' && setting('pickupobject')){	//Take or Put back Object
											if(player.doHave(params.id)){				//Put Back
												newGameState.info.putBack = true;
												player.removeInventory(params.id);

												//Enable the trap
												if(newGameState.info.prematuretrigger === undefined||newGameState.info.prematuretrigger == false){
													villa = getStorage('villa');
													if(newGameState.location.indexOf('bedroom') !== -1){
														let tmpSplit = newGameState.location.split('.');
														villa.bedrooms[tmpSplit[1]].activities[activityId].trap.push(params.id);
													}else{
														villa.locations[newGameState.location].activities[activityId].trap.push(params.id);
													}
													setStorage('villa',villa);

													//Stats
													player.set('stats.trapSetup','++');
												}
											}else{										//Take
												player.addInventory(params.id);
											}
										}

										//Display lootable objects
										for(let lootableId in window.database.lootable){
											let lootable = window.database.lootable[lootableId];
											if(lootable.location != newGameState.location && newGameState.location.indexOf(lootable.location) === -1)
												continue;
											if(lootable.conditions !== undefined && !checkCond(lootable.conditions))
												continue;
											let pictLoot = '';
											if(newGameState.info.lootable === undefined)
												newGameState.info.lootable = [];
											newGameState.info.lootable.push(lootableId);
										}
									}else{									//Doing the Activity
										if(setting('fanfeature') && player.havePerk('nymphet')){		//If Nymphet have fans instead of Votes
											let infoVote = player.giveValueToAdd('addvotes','action',params.id);
											let nbNewFans = player.add('fans',Math.ceil(infoVote.numberCalc * 0.10));
											newGameState.info.addFans = {'nbFans':nbNewFans};
										}else{
											newGameState.info.addVotes = player.addvotes('action',params.id);
										}

										//Stats
											let soloHisto = clone(player.get('stats.soloActivity'));
											if(soloHisto[activityId] === undefined)
												soloHisto[activityId] = 0;
											soloHisto[activityId]++;
											player.set('stats.soloActivity',soloHisto);
									}

									//Pass the time
									newGameState.previousTime = gameStateCurrent.time;
									newGameState.time = increaseTime();
								}
							}
						}

						//When you do some action
						player.doAction(activityId);
					}
				}else if(params.type == 'activity'){				//No Event when Inspecting Activity
					newGameState.actionType = 'seeActivity';
					newGameState.info.activity = params.id;
				}else if(params.type == 'actionDoContinue'){		//Modify Stuff and go back to the Hallway
					let actions = window.database.actions;
					let activityId = actions[params.trapId].activity;
					let player = getCharacter('player');

					player.removeInventory(actions[params.trapId].object);

					let settingEvents = setting('eventsDisabled');
					let eventsCooldown = getStorage('eventsCooldown');
					//Premature Trigger (The trap set off itself prematurely)
					if(settingEvents === undefined || settingEvents.length == 0 || settingEvents.indexOf('prematuretrigger') === -1){
						if(eventsCooldown === false||eventsCooldown.prematuretrigger === undefined||eventsCooldown.prematuretrigger < newGameState.dayNumber){
							let randomTest = random(0,100);
							if(randomTest < window.database.events.prematuretrigger.chance[getStorage('difficulty')]){
								newGameState.actionType = 'doAction';
								newGameState.info.activity = activityId;

								newGameState.info.typeHypno = pickRandom(giveHypnoToUse());	//Choose a random hypno
								newGameState.info.strengthHypno = random(2,3);
								player.beHypno(newGameState.info.typeHypno,newGameState.info.strengthHypno);

								newGameState.info.prematuretrigger = true;

								if(eventsCooldown === false)
									eventsCooldown = {};
								eventsCooldown.prematuretrigger = newGameState.dayNumber + window.database.events.prematuretrigger.cooldown;
								setStorage('eventsCooldown',eventsCooldown);
								
								player.set('stats.eventOtherEncountered.prematuretrigger','++');
								player.set('stats.trapFailure','++');
							}
						}
					}

					//Enable the trap
					if(newGameState.info.prematuretrigger === undefined||newGameState.info.prematuretrigger == false){
						villa = getStorage('villa');
						if(gameStateCurrent.location.indexOf('bedroom') !== -1){
							let tmpSplit = gameStateCurrent.location.split('.');
							villa.bedrooms[tmpSplit[1]].activities[activityId].trap.push(params.trapId);
						}else{
							villa.locations[gameStateCurrent.location].activities[activityId].trap.push(params.trapId);
						}
						setStorage('villa',villa);

						//Stats
						player.set('stats.trapSetup','++');

						newGameState.location = 'hallway';

						//If it's the night play the nextDay
						if(gameStateCurrent.time == 'nextDay')
							newGameState = doTheNextDay(params,newGameState);
					}

					//When you do some action
					player.doAction(activityId);
				}else if(params.type == 'nextDay'){					//Manage the change of day
					newGameState = doTheNextDay(params,newGameState);
				}else if(params.type == 'lootable'){				//Loot something around
					let itemId = params.id;
					let infoLootable = clone(window.database.lootable[itemId]);
					player.addObject(itemId);
					player.save();

					if(infoLootable.effects !== undefined){
						doEffects(infoLootable.effects);
						player = getCharacter('player');	//Refresh values
					}

					//If it's the night play the nextDay
					if(gameStateCurrent.time == 'nextDay'){
						newGameState.location = 'hallway';
						newGameState.actionType = null;
						newGameState = doTheNextDay(params,newGameState);
					}else{
						newGameState.location = 'hallway';
						newGameState.actionType = null;
					}
				}
			}

			//Play the Event
			if(newGameState.actionType == 'event'){
				newGameState.timeActual = newGameState.time;	//Save when it started
				return eventHandler(newGameState,params);
			}

			if(params.type == 'navigation' && newGameState.actionType === null && IsTheEnd()){			//Test EndGame when the player move
				newGameState.info = {};
				newGameState.previousTime = null;
				newGameState.actionType = 'endGame';
			}

			setStorage('gameState',newGameState);

			if(player.mod !== undefined && player.mod.hardcore){
				saveTheGame(player.mod.hardcoreSaveName,player.mod.hardcoreSaveName);
			}

			//Test Achievements
			let achievementsvWin = testAchievement('others');
			if(achievementsvWin.length > 0){
				let countAchievement = 0;
				for(let aId of achievementsvWin){
					setTimeout(function() {showAchievement(aId,'others',getId('achievementsLoc'));}, 2000*countAchievement);
					countAchievement++;
				}
			}
			
			retrieveContent();
		}catch(error){
			console.log('Error at gameControl',error);
			showError(error);
			let from = getStorage('currentPage');
			showPage(from,'main-menu');
		}
	}
	function IsTheEnd(){								//Know if the game should end
		if((getHousemateId('notout').length == 0))
			return true;
		let player = getCharacter('player');
		if(!player.havePerk('crazyworld') && (player.slut >= 100 || player.bimbo >= 100))
			return true;
		else if(player.havePerk('crazyworld') && (player.slut <= 0 || player.bimbo <= 0))
			return true;
		return false;
	}
	function testEvent(params){							//If a event get Triggered
		let gameState = getStorage('gameState');
		let eventsCooldown = getStorage('eventsCooldown');
		let player = getCharacter('player');
		let actions = window.database.actions;

		let info = {'eventKept':null};

		let settingEvents = setting('eventsDisabled');
		if(settingEvents === undefined)
			settingEvents = [];
		let nextEvents = getStorage('nextEvents');
		if(typeof forceNextEvents !== 'undefined')
			nextEvents = forceNextEvents;

		//Get the Range Available
			info.locationEvent = null;
			info.actionEvent = null;
			//When moving from the hallway to another location
			if(params.type === 'navigation'){
				if(params.id.indexOf('bedroom.') !== -1){
					info.locationEvent = 'bedrooms';
				}else if(params.type == 'navigation' && ['bedrooms','hallway'].indexOf(params.id) === -1){
					info.locationEvent = 'hallway';
				}
			}

			//When visiting the cameraroom
			if(params.id == 'cameraroom'){
				if(player.havePerk('camgirl'))		//Can have Events going to the cameraroom with this perk
					return info;
				if(params.choose === undefined)		//When you go the the room, not doing action
					info.locationEvent = params.id;
			}else if(params.type == 'action' && actions[params.id] === undefined && params.people === null){ //When doing solo activity
				info.locationEvent = 'activities';
				info.actionEvent = params.id;
			}

			//When going to sleep
			if(params.type == 'nextDay'){
				info.locationEvent = 'sleep';
			}

		//Get the Available Events
			let eventsAvailable = [];
			for(let eventId in window.database.events){
				let eventInfo = window.database.events[eventId];
				if(gameState.time == 'dawn')														//Everybody sleep
					continue;
				if(settingEvents.indexOf(eventId) !== -1)											//Disabled from the option
					continue;				
				if(eventInfo.when === undefined || (eventInfo.when.indexOf(info.locationEvent) === -1 && (info.actionEvent === null || eventInfo.when.indexOf(info.actionEvent) === -1)))	//If not used here
					continue;
				if(eventsCooldown !== false && eventsCooldown[eventId] !== undefined && gameState.dayNumber < eventsCooldown[eventId])	//If in cooldown
					continue;
				if(eventInfo.conditions !== undefined && !checkCond(eventInfo.conditions))			//If the conditions are ok
					continue;

				if(eventInfo.content !== undefined){												//Have at least one content available
					let listContentOk = [];
					for(let contentId in eventInfo.content){
						let content = eventInfo.content[contentId];
						if(content.conditions !== undefined && !checkCond(content.conditions))
							continue;
						listContentOk.push(contentId);	
					}
					if(listContentOk.length == 0)
						continue;
				}
				eventsAvailable.push(eventId);
			}

		//Perks Influence
			let chanceModifier = {};
			for(let perkId of player.perks){
				let perkInfo = window.database.perks[perkId];
				if(perkInfo.events !== undefined){
					for(let eventId in perkInfo.events){
						if(chanceModifier[eventId] === undefined)
							chanceModifier[eventId] = 1;
						chanceModifier[eventId] *= perkInfo.events[eventId];
					}
				}
			}

		//If an event is trigger
			if(eventsAvailable.length > 0){
				let eventInfo = null;
				eventsAvailable = arrayShuffle(eventsAvailable);	//Make sure events are not favorised by the start order
				for(let eventId of eventsAvailable){
					eventInfo = window.database.events[eventId];
					let randomTest = random(0,1000);
					let chance = eventInfo.chance[getStorage('difficulty')]*10;

					if(chanceModifier[eventId] !== undefined)
						chance *= chanceModifier[eventId];

					chance = Math.ceil(chance / eventsAvailable.length);
					if(eventInfo !== undefined && randomTest < chance){
						info.eventKept = eventId;
						break;
					}
				}

				//To Force an event
				if(nextEvents !== false){
					info.eventKept = nextEvents;
					deleteStorage('nextEvents');
				}
			}

		return info;
	}
	function getContinue(blockPlayed,data,blockChoosed){	//Give for the block what the next block to continue with (event)
		let continueAvailable = {};
		//If we don't have already some continue taken
		if(Object.keys(continueAvailable).length == 0 && data.parts !== undefined && data.parts[blockChoosed].continue !== undefined){
			let blockActual = data.parts[blockChoosed];
			let continueAvailableRanked = {};

			for(let blockId of blockActual.continue){
				let blockInfo = data.parts[blockId];

				//If already played and unique, skip
				if(blockInfo.unique !== undefined && blockInfo.unique && blockPlayed.indexOf(blockId) != -1)
					continue;

				if(blockInfo.conditions !== undefined && !checkCond(blockInfo.conditions))
					continue;

				//Priority By Default is 10, low number mean higher priority
				let priority = (blockInfo.priority !== undefined ? blockInfo.priority : 10);
				if(continueAvailableRanked[priority] === undefined)
					continueAvailableRanked[priority] = {};
				continueAvailableRanked[priority][blockId] = blockInfo;
			}

			for(let priorityRankId in continueAvailableRanked){
				let keysInside = Object.keys(continueAvailableRanked[priorityRankId]);
				if(blockActual.continueMax !== undefined)
					keysInside = arrayShuffle(keysInside);
				for(let blockId of keysInside){
					continueAvailable[blockId] = continueAvailableRanked[priorityRankId][blockId];
					if(blockActual.continueMax !== undefined && blockActual.continueMax <= Object.keys(continueAvailable).length){
						break;break;
					}
				}
			}
		}

		return continueAvailable;
	}
	function eventHandler(gameState,params){			//Control Events

		if(gameState === null){
			gameState = getStorage('gameState');
		}
		let player = getCharacter('player');
		let eventKept = gameState.info.eventKept;
		let eventData = window.database.events[eventKept];

		let blockChoosed = null;
		gameState.info.blockToPlay = [];

		//Execute
		if(params === undefined||(params.blockSelected === undefined && params.eventCounter === undefined)){		//First execution
			if(['hallway','activities'].indexOf(eventKept) !== -1){
				//Choose the housemate
				let housematesId = getHousemateId('actif');
				let housemate = null;
				if(housematesId.length > 0){
					gameState.info.housemateId = pickRandom(housematesId);
					gameState.info.housematesId = [gameState.info.housemateId];
					housemate = getCharacter(gameState.info.housemateId);
				}

				//Choose the Set & Stuff
				if(housemate !== null){
					let behaviorHere = (typeof forceEventBehavior !== 'undefined' ? forceEventBehavior : housemate.get('behavior'));
					let hypnoType = window.database.behaviors[behaviorHere].hypno;
					gameState.info.hypnoLvl = (typeof forceEventLvl !== 'undefined' ? forceEventLvl :  giveHypnoLvl());

					let displayInfo = clone(window.database.behaviors[behaviorHere].hypnoDisplay);
					if(displayInfo === undefined){					//If not specified for that behavior
						displayInfo = clone(window.database.behaviors.default.hypnoDisplay);
					}else{
						displayInfo = {...displayInfo, ...clone(window.database.behaviors.default.hypnoDisplay)};
					}

					//Choose the set to play
						let setAvailable = [];
						for(let setId in displayInfo){
							if(displayInfo[setId].conditions !== undefined && displayInfo[setId].conditions.length > 0 && !checkCond(displayInfo[setId].conditions))
								continue;

							if(displayInfo[setId].stage === undefined || displayInfo[setId].stage.indexOf(housemate.get('stage')) !== -1){
								setAvailable.push(setId);
								if(setId.indexOf('defaultSet') === -1){		//3x more chance to have a specific behavior set than a default
									setAvailable.push(setId);
									setAvailable.push(setId);
								}
							}
						}
						gameState.info.setKept = (typeof forceEventId !== 'undefined' ? forceEventId : pickRandom(setAvailable));

					let infoSet = null;
					if(gameState.info.setKept.indexOf('defaultSet') !== -1)
						infoSet = window.database.behaviors.default.hypnoDisplay[gameState.info.setKept];
					else
						infoSet = window.database.behaviors[behaviorHere].hypnoDisplay[gameState.info.setKept];

					//Add Additional Housemate if necessary
						if(infoSet.nbChar !== undefined && infoSet.nbChar > 1){
							let housematesIdStill = arrayDiff(housematesId,gameState.info.housematesId);
							let addHousemate = pickRandom(housematesIdStill,infoSet.nbChar-1);
							gameState.info.housematesId = arrayConcat(gameState.info.housematesId,addHousemate);
						}

					//Additionnal data
						gameState.info.counter = [];
						if(infoSet.canCounter === undefined || infoSet.canCounter.length > 0){
							if(infoSet.canCounter === undefined){		//Default value
								infoSet.canCounter = ['orb','powder','betterbimbobody'];
								if(player.get('nimbleCooldown') === undefined || player.get('nimbleCooldown') < gameState.dayNumber)
									infoSet.canCounter.push('nimble');
							}

							for(let elemCounter of infoSet.canCounter){
								if(player.inventory[elemCounter] !== undefined && player.inventory[elemCounter].quantity > 0){
									gameState.info.counter.push(elemCounter);
								}else if(player.havePerk(elemCounter)){
									if(elemCounter == 'betterbimbobody'){
										let infoPerk = window.database.perks[elemCounter];
										let testDistracted = random(0,100);
										if(infoPerk.distraction !== undefined && testDistracted <= infoPerk.distraction)
											gameState.info.distracted = true;
									}else{
										gameState.info.counter.push(elemCounter);
									}
								}
							}
						}

					if(infoSet.noHypno === undefined && gameState.info.hypnoLvl == 'simple')
						gameState.info.hypnoLvl = 'soft';

					//Determine what to play	
						let stuffToPlay = ['base'];
						if(gameState.info.distracted !== undefined && gameState.info.distracted){
							stuffToPlay.push('distracted');
						}else if(gameState.info.hypnoLvl == 'simple'){
							stuffToPlay.push('noHypno');
						}else{
							if(gameState.info.counter.length > 0){
								stuffToPlay.push('counter');
							}else{
								stuffToPlay.push('hypno');
								if(gameState.info.hypnoLvl != 'soft'){
									stuffToPlay.push('hypnoContinue');
								}
								stuffToPlay.push('hypnoFinish');
							}
						}
						gameState.info.stuffToPlay = stuffToPlay;

					//Save Stats
						let ambushHisto = clone(player.get('stats.ambush'));
						if(ambushHisto[gameState.info.housemateId] === undefined)
							ambushHisto[gameState.info.housemateId] = {};
						if(gameState.info.distracted !== undefined && gameState.info.distracted){
							if(ambushHisto[gameState.info.housemateId]['distracted'] === undefined)
								ambushHisto[gameState.info.housemateId]['distracted'] = 0;
							ambushHisto[gameState.info.housemateId]['distracted']++;
						}else{
							if(ambushHisto[gameState.info.housemateId][gameState.info.hypnoLvl] === undefined)
								ambushHisto[gameState.info.housemateId][gameState.info.hypnoLvl] = 0;
							ambushHisto[gameState.info.housemateId][gameState.info.hypnoLvl]++;
						}
						player.set('stats.ambush',ambushHisto);
						player.set('stats.nbambush','++');
				}
			}else if(['accountant'].indexOf(eventKept) !== -1){
						
				//If not yet set
				let villa = getStorage('villa');

				//Mess with the player cheat
				if(player.stats.cheatsCurrent !== undefined && Object.keys(player.stats.cheatsCurrent).length > 0){
					gameState.info.listCheat = [];
					for(let cheatId in player.stats.cheatsCurrent){
						if(player.stats.cheatsCurrent[cheatId] > 0){
							switch(cheatId){
								case "votes":
									player.votes = 0;
									player.save();
									break;
								case "perks":
									player.addPerks(['alpha']);
									break;
								case "traps":
									let actions = window.database.actions;
									let locaAction = {};
									for(let id in actions){
										let action = actions[id];
										if(locaAction[action.activity] === undefined)
											locaAction[action.activity] = [];
										locaAction[action.activity].push(id);
									}
									for(let loca in villa.locations){
										for(let actiId in villa.locations[loca].activities){
											if(locaAction[actiId] !== undefined){
												for(let actionId of locaAction[actiId]){
													villa.locations[loca].activities[actiId].trap = [];
												}
											}
										}
									}
									for(let loca in villa.bedrooms){
										for(let actiId in villa.bedrooms[loca].activities){
											if(locaAction[actiId] !== undefined){
												for(let actionId of locaAction[actiId]){
													villa.bedrooms[loca].activities[actiId].trap = [];
												}
											}
										}
									}
									setStorage('villa',villa);
									break;
							}
							delete player.stats.cheatsCurrent[cheatId];
							player.save();
							gameState.info.listCheat.push(cheatId);
						}
					}
				}					
			}

			//Pick the start, the first one to match
			if(eventData.start !== undefined){
				for(let blockId of eventData.start){
					let blockInfo = eventData.parts[blockId];
					if(blockInfo.conditions !== undefined && !checkCond(blockInfo.conditions))
						continue;
					blockChoosed = blockId;
					break;
				}
			}

			//Force a place
			if(eventData.setRoom !== undefined){
				gameState.location = eventData.setRoom;
			}

			//Pass the time
			gameState.previousTime = gameState.time;
			if(gameState.time !== 'nextDay')
				gameState.time = increaseTime();

			//Save Stats
			let eventsHisto = clone(player.get('stats.eventOtherEncountered'));
			if(eventsHisto[eventKept] === undefined)
				eventsHisto[eventKept] = 0;
			eventsHisto[eventKept]++;
			player.set('stats.eventOtherEncountered',eventsHisto);

			//Set Cooldown if needed
			if(eventKept !== null && eventData !== null && eventData.cooldown !== undefined){
				let eventsCooldown = getStorage('eventsCooldown');
				if(eventsCooldown === false)
					eventsCooldown = {};
				eventsCooldown[eventKept] = gameState.dayNumber + eventData.cooldown;
				setStorage('eventsCooldown',eventsCooldown);
			}
		}else if(params !== undefined && params.eventCounter !== undefined){		//Continue the Events Ambush
			let use = params.eventCounter;
			gameState.info.use = use;

			let housemate = getCharacter(gameState.info.housemateId);

			let stuffToPlay = [];
			if(use == 'nothing'){		//Do Nothing and let it happen
				stuffToPlay.push('hypno');
				if(gameState.info.hypnoLvl != 'soft'){
					stuffToPlay.push('hypnoContinue');
				}
				stuffToPlay.push('hypnoFinish');
			}else{

				if(housemate.get('info') === false)
					housemate.set('info',{});

				//Use the Object
				player.set('inventory.'+use+'.quantity','--');

				//Test if you can counter
				let fail = false;
				if(use == 'powder' && (housemate.stage == 0 || (housemate.get('info') !== undefined && housemate.get('info.counterpowder') !== undefined)))
					fail = true;
				else if(use == 'orb' && (housemate.stage <= 1 || (housemate.get('info') !== undefined && housemate.get('info.counterorb') !== undefined)))
					fail = true;
				else if(use == 'techcomponents'){
					if((housemate.get('info') !== undefined && housemate.get('info.countertechcomponents') !== undefined)){
						fail = true;
					}else{
						let thresholdWin = 75;
						if(player.bimbo > 75||player.bimboStage > 4)
							thresholdWin = 33;
						let randomValue = random(0,100);
						if(randomValue > thresholdWin)
							fail = true;
					}
				}

				if(!fail){
					if(housemate.get('info') === undefined)
						housemate.set('info',{});
					housemate.set('info.counter'+use,true);
				}

				if(fail){
					//Increase the Hypno
					let hypnoTypesLvl = window.database.hypnoTypesLvl;
					let newLvl = hypnoTypesLvl.indexOf(gameState.info.hypnoLvl)+1;
					if(newLvl >= hypnoTypesLvl.length)
						newLvl = hypnoTypesLvl.length-1;
					gameState.info.hypnoLvl = hypnoTypesLvl[newLvl];
					stuffToPlay.push('counterFail'+ucfirst(use));
				}else{
					stuffToPlay.push('counterWin'+ucfirst(use));
				}
			}
			gameState.info.stuffToPlay = stuffToPlay;
				
		}else{
			blockChoosed = params.blockSelected;
		}

		if(blockChoosed !== null)
			gameState.info.blockToPlay.push(blockChoosed);

		//Save the path used
		if(gameState.info.blockPlayed === undefined)
			gameState.info.blockPlayed = gameState.info.blockToPlay;
		else
			gameState.info.blockPlayed = gameState.info.blockPlayed.concat(gameState.info.blockToPlay);

		//Play Effects before continue
		if(blockChoosed !== undefined && blockChoosed !== null){
			let blockInfo = eventData.parts[blockChoosed];
			if(blockInfo.effectsUpFrontCrazyworld !== undefined && blockInfo.effectsUpFrontCrazyworld.length > 0 && player.havePerk('crazyworld')){
				doEffects(blockInfo.effectsUpFrontCrazyworld);
			}else if(blockInfo.effectsUpFront !== undefined && blockInfo.effectsUpFront.length > 0){
				doEffects(blockInfo.effectsUpFront);
			}
		}
			
		//Check if continue and choice or direct
		let continueAvailable = getContinue(gameState.info.blockPlayed,eventData,blockChoosed);
		while(Object.keys(continueAvailable).length == 1){
			let blockNow = Object.keys(continueAvailable)[0];
			let blockInfo = eventData.parts[blockNow];
			if(blockInfo.noFuse !== undefined && blockInfo.noFuse)break;		//Dont fuse
			gameState.info.blockToPlay.push(blockNow);

			//Play Effects before continue
			if(blockInfo.effectsUpFrontCrazyworld !== undefined && blockInfo.effectsUpFrontCrazyworld.length > 0 && player.havePerk('crazyworld')){
				doEffects(blockInfo.effectsUpFrontCrazyworld);
			}else if(blockInfo.effectsUpFront !== undefined && blockInfo.effectsUpFront.length > 0){
				doEffects(blockInfo.effectsUpFront);
			}

			continueAvailable = getContinue(gameState.info.blockPlayed,eventData,blockNow);
		}
		if(Object.keys(continueAvailable).length > 0){
			gameState.info.continueList = Object.keys(continueAvailable);
		}else{
			delete gameState.info.continueList;
		}

		//Play Effects
		if(gameState.info.blockToPlay.length > 0){
			for(let blockId of gameState.info.blockToPlay){
				let blockInfo = eventData.parts[blockId];
				if(blockInfo.effectsCrazyworld !== undefined && blockInfo.effectsCrazyworld.length > 0 && player.havePerk('crazyworld')){
					doEffects(blockInfo.effectsCrazyworld);
				}else if(blockInfo.effects !== undefined && blockInfo.effects.length > 0){
					doEffects(blockInfo.effects);
				}
			}
		}

		//Others Effects
		if(gameState.info.stuffToPlay){
			player = getCharacter('player');
			let housemate = getCharacter(gameState.info.housemateId);
			let behaviorHere = housemate.get('behavior');
			let hypnoType = window.database.behaviors[behaviorHere].hypno;

			for(let blockId of gameState.info.stuffToPlay){
				//Play the Hypno if necesary
					if(['noHypno','hypno'].indexOf(blockId) !== -1||blockId.indexOf('counterFail') !== -1){
						switch(gameState.info.hypnoLvl){
							case 'hard':player.beHypno(hypnoType,4);break;
							case 'standard':player.beHypno(hypnoType,3);break;
							case 'soft':player.beHypno(hypnoType,2);break;
							case 'simple':player.beHypno(hypnoType,1);break;
						}
					}

				//Stats
					if(blockId.indexOf('counterWin') !== -1){
						let counterWin = player.get('stats.counter.win');
						if(counterWin === false)
							player.set('stats.counter',{'win':0,'fail':0});
						player.set('stats.counter.win','++');

						//Next Hypno Stage to housemate (if not Nimble)
						if(blockId != 'counterWinNimble'){
							housemate.addStage();
						}else{
							player.set('nimbleCooldown',gameState.dayNumber+3);
						}

					}else if(blockId.indexOf('counterFail') !== -1){
						let counterFail = player.get('stats.counter.fail');
						if(counterFail === false)
							player.set('stats.counter',{'win':0,'fail':0});
						player.set('stats.counter.fail','++');
					}
			}
		}

		//Save changes
		setStorage('gameState',gameState);

		//Display
		retrieveEvent();								//Display the Events

		showInformation();								//Display Additionnal Information (votes gain, Popup...)

		retrieveSidebar();								//Display the Sidebar

		activateController();							//Enable the control (button, etc...)

		renderStuff();									//Manage Animations and others
	}
	function retrieveContent(){							//Choose what to display according to the gameState
		try {
			getId('gameContent').querySelector('article').scrollTo(0,0);
			manageDitzScreen();
			
			manageVersion();

			let gameState = getStorage('gameState');

			clearPages();									//Clean the pages from the previous content

			let display = [];
			if(gameState.actionType === null){
				retrieveLocations();						//See the HallWays, the Bedrooms or the Activity of the Room
			}else if(gameState.actionType == 'seeActivity'){
				retrieveActivities();						//See the Action available for an Activity
			}else if(gameState.actionType == 'doAction'){
				retrieveAction();							//Do an Activity, Interact with Housemate or Set a Trap
			}else if(gameState.actionType == 'event'){
				retrieveEvent();							//Do an Event
			}else if(gameState.actionType == 'dailyRecap'){
				retrieveDailyRecap();						//Have the dailyRecap
			}else if(gameState.actionType == 'endGame'){
				retrieveEndGame();							//Show the EndGame
			}

			showInformation();								//Display Additionnal Information (votes gain, Popup...)

			retrieveSidebar();								//Display the Sidebar

			activateController();							//Enable the control (button, etc...)

			renderStuff();									//Manage Animations and others
		}catch(error){
			console.log('Error at retrieveContent',error);
			showError(error);
			let from = getStorage('currentPage');
			showPage(from,'main-menu');
		}
	}
	function clearPages(){								//Clean the pages from the previous content
		getId('dailyDream').querySelector('content').innerHTML = '';
		getId('dailyFun').querySelector('content').innerHTML = '';
		getId('dailyRecap').querySelector('content').innerHTML = '';
		getId('dailyFolio').querySelector('content').innerHTML = '';
		getId('dailyHypno').querySelector('content').innerHTML = '';
		getId('storyPage').innerHTML = '';
		getId('housemateList').innerHTML = '';
		getId('charListIA').innerHTML = '';
		getId('main-gamewindow').querySelector('main').innerHTML = '';
		getId('main-patchNotes').querySelector('ul').innerHTML = '';
		getId('main-achievement').querySelector('content').innerHTML = '';

		//Menu Options
			getId('listEvents').innerHTML = '';
			getId('listParticipants').innerHTML = '';
			getId('listClothtop').innerHTML = '';
			getId('listClothbottom').innerHTML = '';
			getId('listHypno').innerHTML = '';
			getId('listDreams').innerHTML = '';
			getId('contentstats').innerHTML = '';
	}
	function retrieveLocations(){						//Display the HallWays, the Bedrooms or the Activity of the Room
		let gameState = getStorage('gameState');
		let villaData = getStorage('villa');
		let player = getCharacter('player');

		function retrieveAvailableActivities(){			//Get the content of the Room
			let gameState = getStorage('gameState');
			let player = getCharacter('player');
			let infoLocation = getLocationInfo(gameState.location);

			let content = [];
			if(infoLocation.pict !== undefined){
				content.push('<div class="centerContent"><img src="'+infoLocation.pict+'"></div>');
			}

			let havePeople = false;
			let listActivities = [];
			if(infoLocation.activities !== undefined){
				let activitiesAvailable = Object.keys(infoLocation.activities);
				if(activitiesAvailable.length > 0){
					let activitiesUsed = [];
					if(infoLocation.people !== undefined && infoLocation.people.length > 0){
						for(let peopleInfo of infoLocation.people){
							let character = getCharacter(peopleInfo.id);
							let activityHere = character.getCurrentActivity();
							listActivities.push('<li class="actionBtn useBtn" data-action="'+activityHere+'" data-people="'+peopleInfo.id+'"><img src="'+peopleInfo.pict+'"><span>'+getTrad('activity.'+activityHere+'.used', character)+'</span></li>');
							activitiesUsed.push(activityHere);

							havePeople = true;
						}
					}
					let activityRemaining = arrayDiff(Object.keys(infoLocation.activities),activitiesUsed);
					for(let activityId of activityRemaining){
						let activityInfo = infoLocation.activities[activityId];
						listActivities.push('<li class="activityBtn useBtn" data-activity="'+activityId+'"><img src="'+activityInfo.icon+'"><span>'+getTrad('activity.'+activityId+'.base')+'</span></li>');
					}
				}
			}

			//Display lootable objects
			for(let lootableId in window.database.lootable){
				let lootable = window.database.lootable[lootableId];
				if(havePeople)
					continue;
				if(lootable.location != gameState.location)
					continue;
				if(lootable.conditions !== undefined && !checkCond(lootable.conditions))
					continue;
				listActivities.push('<li class="lootableBtn useBtn" data-id="'+lootableId+'"><img src="'+lootable.pict+'"><span>'+getTrad(lootable.text)+'</span></li>');
			}

			if(listActivities.length > 0){
				content.push('<ul class="actionDisplay">'+listActivities.join('')+'</ul>');
			}

			content.push('<div class="centerContent"><a class="btn locationBtn" data-location="hallway">'+getTrad('basic.moveon')+'</a></div>');

			return content;		//Give the content of a Room
		}

		let content = [];
		content.push(retrieveLocationTitle());

		if(gameState.location === 'bedrooms'){						//In front of the bedrooms
			let html = '<div class="locationShow">';
			for(let charId of getHousemateId('everyone')){
				let infoLocation = getLocationInfo('bedroom.'+charId);
				if(infoLocation !== undefined){

					let peopleFace = []; let addFaces = '';
					let peopleName = []; let titleFace = '';
					if(infoLocation.people.length > 0){
						for(let info of infoLocation.people){
							peopleFace.push('<img src="'+info.pict+'">');
							peopleName.push(info.name);
						}
						addFaces = '<div class="locationFace">'+peopleFace.join('')+'</div>';
						titleFace = (peopleName.length > 1?peopleName.join(', ')+' '+getTrad('basic.arehere'):peopleName.join(', ')+' '+getTrad('basic.ishere'));
					}

					let classHere = ['locationDisplay','locationBtn'];
					let addElem = [];
					let addPart = '';
					if(gameState.time == 'dawn' && charId != 'player'){
						addElem.push('<span class="displayClose">'+getTrad('basic.close')+'</span>');
						addPart = 'disabled';
					}
					let trad = (charId == 'player' ? 'locations.bedroomplayer.title' : 'locations.bedroom.title');
					html += '<div class="'+classHere.join(' ')+'" '+addPart+' title="'+titleFace+'" data-location="bedroom.'+charId+'">'+
									'<span class="mainLocationPicture"><img src="'+infoLocation.pict+'"></span>'+
									'<div class="locationName">'+getTrad(trad,getCharacter(charId))+'</div>'+
									addFaces+
									addElem.join('')+
							'</div>';
				}
			}
			html += '</div>';
			content.push(html);

			content.push('<div class="centerContent"><a class="btn locationBtn" data-location="hallway">'+getTrad('basic.moveon')+'</a></div>');
		}else if(gameState.location.indexOf('bedroom.') !== -1){	//Inside a bedroom
			content = [...content,...retrieveAvailableActivities()];
		}else if(gameState.location == 'hallway'){					//In the HallWays
			//BedRooms
				let bedrooms = [];
				let nbBed = 0;
				for(let charId of getHousemateId('everyone')){
					bedrooms.push('<img src="'+villaData.bedrooms[charId].pict+'">');
					nbBed++;
				}
				content.push('<div class="locationDisplay bedroomPictures locationBtn nbBed-'+nbBed+'" data-location="bedrooms"><span class="mainLocationPicture">'+bedrooms.join('')+'</span><div class="locationName">'+getTrad('basic.bedrooms')+'</div></div><br>');

			//Locations
				let html = '<div class="locationShow">';
				for(let locationId in villaData.locations){

					//Walking in the villa, the additionnal centeral picture
					if(locationId == 'cameraroom'){
						let inHallwayData = window.database.participants[player.get('archetype')].inHallway;
						if(inHallwayData !== undefined){
							let pickHallwaySet = player.get('pickHallwaySet');
							if(pickHallwaySet !== undefined){
								let pictHallway = inHallwayData[pickHallwaySet][player.get('slutState')];
								if(pictHallway !== undefined){
									html += '<div class="locationDisplayPlayer">'+
										'<div class="centerContent">'+imgVideo(pictHallway)+'</div>'+
										'<div class="centerContent">'+getTrad('inhallway.'+player.get('slutState'))+'</div>'+
									'</div>';
								}
							}
						}
					}

					let infoLocation = getLocationInfo(locationId);
					if(infoLocation !== undefined){

						let peopleFace = []; let addFaces = '';
						let peopleName = []; let titleFace = '';
						if(infoLocation.people.length > 0){
							for(let info of infoLocation.people){
								peopleFace.push('<img src="'+info.pict+'">');
								peopleName.push(info.name);
							}
							addFaces = '<div class="locationFace">'+peopleFace.join('')+'</div>';
							titleFace = (peopleName.length > 1?peopleName.join(', ')+' '+getTrad('basic.arehere'):peopleName.join(', ')+' '+getTrad('basic.ishere'));
						}

						if(locationId == 'cameraroom'){

							let disabled = '';
							if(locationId == 'cameraroom' && gameState.cameraUsed){
								disabled = 'disabled="disabled"';
							}

							let stateCameraRoom = '';
							if(gameState.cameraUsed){
								stateCameraRoom = '<span class="icon icon-lock" title="'+getTrad('basic.cameraroomlocked')+'"></span>'	
							}else{
								stateCameraRoom = '<span class="icon icon-unlock" title="'+getTrad('basic.cameraroomunlocked')+'"></span>'
							}

							html += '<div class="locationDisplay actionBtn" title="'+titleFace+'" '+disabled+' data-action="'+locationId+'">'+
										'<span id="lockCameraRoom">'+stateCameraRoom+'</span>'+
										'<span class="mainLocationPicture"><img src="'+infoLocation.pict+'"></span>'+
										'<div class="locationName">'+getTrad('locations.'+locationId+'.title')+'</div>'+
										addFaces+
									'</div>';
						}else{
							html += '<div class="locationDisplay locationBtn" title="'+titleFace+'" data-location="'+locationId+'">'+
										'<span class="mainLocationPicture"><img src="'+infoLocation.pict+'"></span>'+
										'<div class="locationName">'+getTrad('locations.'+locationId+'.title')+'</div>'+
										addFaces+
									'</div>';
						}
					}
				}
				html += '</div>';
				content.push(html);
		}else{														//Inside a Room
			content = [...content,...retrieveAvailableActivities()];
		}

		getId('main-gamewindow').querySelector('article main').innerHTML = content.join('');
		let from = getStorage('currentPage');
		showPage(from,'main-gamewindow');
	}
	function retrieveLocationTitle(){					//Get the name of the location
		let gameState = getStorage('gameState');
		let infoLocation = getLocationInfo(gameState.location);
		let titleLocation = getTrad('locations.'+infoLocation.type+'.title');
		if(infoLocation.type == 'bedroom'){
			if(infoLocation.owner !== 'player'){
				titleLocation = getTrad('locations.'+infoLocation.type+'.title',getCharacter(infoLocation.owner));
			}else{
				titleLocation = getTrad('locations.bedroomplayer.title');
			}
		}
		return '<h1>'+titleLocation+'</h1>';			//Give the name of where the player is
	}
	function retrieveActivities(){						//Display the Action available for an Activity
		let gameState = getStorage('gameState');
		let infoLocation = getLocationInfo(gameState.location);
		let player = getCharacter('player');

		let content = [];
		content.push(retrieveLocationTitle());

		if(infoLocation.pict !== undefined){
			content.push('<div class="centerContent"><img src="'+infoLocation.pict+'"></div>');
		}

		let activityInfo = infoLocation.activities[gameState.info.activity];
		let activities = Object.keys(infoLocation.activities);

		//We don't want be able to read outside our own bedroom
		if(infoLocation.type != 'bedroom'||infoLocation.owner === 'player')
			content.push('<li class="actionBtn useBtn" data-action="'+gameState.info.activity+'"><img src="'+activityInfo.iconAction+'"><span>'+getTrad('activity.'+gameState.info.activity+'.action')+'</span></li>');

		//If nobody display objects AND we don't want to trap our own bedroom
		if(infoLocation.type != 'bedroom'||infoLocation.owner !== 'player'){
			let actions = clone(window.database.actions);

			//If you have the "Happy" perk, you can't set traps
			let isDisabled = (player.perks.indexOf('happy') !== -1 ? 'disabled="disabled"' : '');
			let dontWantToUse = (player.perks.indexOf('happy') !== -1 ? '<span class="displayOut">'+getTrad('basic.dontwanttouse',player)+'</span>' : '');

			for(let actionId in actions){
				let action = actions[actionId];
				if(gameState.location.indexOf(action.location) == -1)
					continue;
				if(gameState.info.activity != action.activity)
					continue;
				if(action.type != 'inventory' || player.inventory[actionId] === undefined){
					let pictObject = (action.pict !== undefined ? action.pict : action.pictbase);
					content.push('<li class="actionBtn useBtn" data-action="'+actionId+'" '+isDisabled+'><img src="'+pictObject+'"><span>'+getTrad('actions.'+actionId+'.btn')+'</span>'+dontWantToUse+'</li>');
				}else if(player.inventory[actionId] !== undefined && player.inventory[actionId].modified == true){
					content.push('<li class="actionBtn useBtn" data-action="'+actionId+'" '+isDisabled+'><img src="'+action.pictmod+'"><span>'+getTrad('actions.putback',{'object':getTrad('actions.'+actionId+'.name')})+'</span>'+dontWantToUse+'</li>');
				}
			}
		}

		//MeditationBook
		if(infoLocation.type == 'bedroom' && infoLocation.owner == 'player' && player.inventory.meditationbook !== undefined){
			content.push('<li class="actionBtn useBtn" data-action="meditationbook"><img src="'+window.database.buyable.meditationbook.pict+'"><span>'+getTrad('buyable.meditationbook.name')+'</span></li>');
		}

		content.push('<div class="centerContent"><a class="btn locationBtn" data-location="hallway">'+getTrad('basic.moveon')+'</a></div>');

		getId('main-gamewindow').querySelector('article main').innerHTML = content.join('');
		let from = getStorage('currentPage');
		showPage(from,'main-gamewindow');
	}
	function retrieveAction(){							//Do an Activity, Interact with Housemate or Set a Trap
		let gameState = getStorage('gameState');
		let player = getCharacter('player');

		let content = [];
		let textBtnContinue = getTrad('basic.moveon');
		let noBtnContinue = false;

		if(gameState.info !== undefined && gameState.info.activity !== undefined){
			if(gameState.info.activity == 'cameraroom'){
				content.push(retrieveLocationTitle());
				content.push('<div class="centerContent">'+getTrad('cameraroom.arrive')+'</div>');

				//Get the Photo
					let photo = window.database.participants[player.archetype].camsPhoto[player.camsPhotoId][player.get('slutState')];

					//Perks
					let textPerk = null;
					if(player.havePerk('exhibitionist')){
						textPerk = getTrad('activity.cameraroom.perkexhibitionist',player);
						content.push(getPictuHypno(photo,window.database.perks.exhibitionist.videoHypno,'videoHypnoCamera'));
					}else if(player.havePerk('naturist')){
						textPerk = getTrad('activity.cameraroom.perknaturist',player);
						content.push(getPictuHypno(photo,window.database.perks.naturist.videoHypno,'videoHypnoCamera'));
					}else{
						content.push('<div class="centerContent">'+imgVideo(photo)+'</div>');
					}

				//Get the Text
					let displayText = [];

					//Starter
					displayText.push(getTrad('activity.cameraroom.start',player));

					//Grudge
					if(gameState.dayNumber < 7)
						displayText.push(getTrad('activity.cameraroom.grudge',player));

					if(textPerk !== null)
						displayText.push(textPerk);

					//Find The Text
					let slugToText = 'behaviors.'+player.get('behavior')+'.cameraroom.'+player.get('slutState');
					let textToDisplay = getTrad(slugToText,player);
					if(textToDisplay == slugToText)
						textToDisplay = getTrad('behaviors.default.cameraroom.'+player.get('slutState'),player);
					displayText.push(textToDisplay);

					//Camera reaction
					displayText.push(getTrad('activity.cameraroom.reaction.'+player.get('slutState'),player));

					content.push('<div class="justifyContent" style="width: 70%;margin: auto;">'+displayText.join('<br><br>')+'</div>');

				//Get Btn
					if(setting('fanfeature')){
						noBtnContinue = true;

						let camNewFans = window.database.difficulty[getStorage('difficulty')].camNewFans;
						let info = player.giveValueToAdd('add','cameraroom','fans',camNewFans);
						let valueToAddFans = info.numberCalc;
						content.push('<div class="centerContent">'+
											'<a class="btn btnCamera useBtn" data-use="appeal">'+
												'<img src="data/img/other/appeal_btn.jpg">'+
												'<span>'+getTrad('basic.cameraroomappeal')+'</span>'+
												'<div class="futureNumber futureFans"><span class="icon icon-fan"></span>'+valueToAddFans+'</div>'+
											'</a>'+
									'</div>');

						info = player.giveValueToAdd('addvotes','cameraroom');
						let valueToAddVotes = info.numberCalc;
						content.push('<div class="centerContent">'+
											'<a class="btn btnCamera useBtn" data-use="entertain">'+
												'<img src="data/img/other/entertain_btn.jpg">'+
												'<span>'+getTrad('basic.cameraroomentertain')+'</span>'+
												'<div class="futureNumber futureVotes"><span class="icon icon-heart"></span>'+valueToAddVotes+'</div>'+
											'</a>'+
									'</div>');
					}
			}else if(gameState.info.activity == 'meditationbook'){
				if(gameState.info.meditationFail !== undefined){
					if(gameState.info.meditationFail == 'slut'){
						let funType = (player.doHave('sextoys')?'dildo':'manual');
						let typeMast = window.database.morning.masturbationType[player.get('sizeBoobs')];
						let pictsMast = window.database.morning.masturbation[funType][typeMast][gameState.info.funtimeId].display;

						content.push('<h1>'+getTrad('activity.meditationbook.titleFailSlut')+'</h1>');
						content.push('<div class="justifyContent">'+getTrad('activity.meditationbook.startFailSlut'+ucfirst(funType))+'</div>');
						content.push('<div class="centerContent">'+imgVideo(pictsMast[0])+'</div>');
						content.push('<div class="justifyContent">'+getTrad('activity.meditationbook.continueFailSlut'+ucfirst(funType))+'</div>');
						content.push('<div class="centerContent">'+imgVideo(pictsMast[1])+'</div>');
						content.push('<div class="justifyContent">'+getTrad('activity.meditationbook.endFailSlut')+'</div>');
					}else{							//Bimbo
						content.push('<h1>'+getTrad('activity.meditationbook.titleFailBimbo')+'</h1>');
						content.push('<div class="justifyContent">'+getTrad('activity.meditationbook.startFailBimbo')+'</div>');
						content.push('<div class="centerContent">'+imgVideo('data/img/other/sleeping.mp4')+'</div>');
						content.push('<div class="justifyContent">'+getTrad('activity.meditationbook.endFailBimbo')+'</div>');
					}
				}else{
					content.push('<h1>'+getTrad('activity.meditationbook.title')+'</h1>');
					content.push('<div class="justifyContent">'+getTrad('activity.meditationbook.start')+'</div>');
					content.push('<div class="centerContent">'+imgVideo('data/img/other/meditation.mp4')+'</div>');
					content.push('<div class="justifyContent">'+getTrad('activity.meditationbook.end')+'</div>');
				}
			}else{
				if(gameState.info.people !== undefined){		//Interact with Housemate

					let participant = getCharacter(gameState.info.people);
					content.push(retrieveLocationTitle());

					if(gameState.info.trap !== undefined && gameState.info.trap){		//If a trap is activated
						content.push('<div class="centerContent">'+getTrad('activity.traphousemate.start',participant)+'</div>');
						content.push(discuss(participant.get('pict'),participant.getName(),getTrad('activity.traphousemate.surprised',participant)));

						let hypnoPict = pickRandom(clone(window.database.participants[participant.get('archetype')].hypnoPicts));
						content.push('<div class="centerContent">'+imgVideo(hypnoPict)+'</div>');
						content.push('<div class="centerContent">'+getTrad('activity.traphousemate.continue',participant)+'</div>');
						content.push('<div class="centerContent">'+imgVideo(hypnoPict)+'</div>');
						content.push('<div class="centerContent">'+getTrad('activity.traphousemate.end',participant)+'</div>');

						if(gameState.info.housemateOut !== undefined && gameState.info.housemateOut){
							content.push('<div class="centerContent">'+getTrad('activity.traphousemate.alreadyout',participant)+'</div>');
						}
					}else{																//Normal Interaction, no trap
						let pictActi = participant.giveActivity(gameState.info.activity);
						if(pictActi !== false){
							content.push('<div class="centerContent">'+imgVideo(pictActi)+'</div>');
						}else{
							content.push('<div class="centerContent">'+imgVideo(participant.get('pict'))+'</div>');
						}
						let actionText = getTrad('actions.'+gameState.info.action+'.used',{'player':player,'housemate':participant});

						//Highlight the used action text
							let clueaction = setting('clueaction');
							if(clueaction !== undefined && clueaction){
								actionText = '<b class="highlightAction">'+actionText+'</b>';
							}

						//Trap Fail
						if(gameState.info.trapFail !== undefined && gameState.info.trapFail)
							content.push('<div class="centerContent">'+getTrad('activity.trapfail',{'player':player,'housemate':participant})+'</div>');

						//Find the text to display
							let behaviorsText = gObj(window.database,'behaviors.'+ participant.get('behavior') +'.activities.'+ gameState.info.activity);
							let defaultText = gObj(window.database,'behaviors.default.activities.'+ gameState.info.activity);
							let textFind = null;
							if(behaviorsText !== undefined && Object.keys(behaviorsText).length > 0)
								textFind = behaviorsText;
							else if(defaultText !== undefined && Object.keys(defaultText).length > 0)
								textFind = defaultText;

							if(textFind !== null){
								let typeChoice = givePartToUsed(textFind,participant,'activity');

								//Sort set to keep
								let keysChoice = Object.keys(textFind[typeChoice]);
								let baseChoice = [];		//Without conditions
								let specificChoice = [];	//With conditions(high priority)
								for(let setId of keysChoice){
									let infoChoice = textFind[typeChoice][setId];
									if(infoChoice.conditions === undefined||infoChoice.conditions.length == 0){
										baseChoice.push(setId);
									}else{
										if(checkCond(infoChoice.conditions)){
											specificChoice.push(setId);
										}
									}
								}
								let keepChoice = (specificChoice.length > 0 ? specificChoice : baseChoice);
								let setChoice = pickRandom(keepChoice);
								let paramsContent = {'player':player,'housemate':participant,'ACTION':actionText};
								content = arrayConcat(content,giveDisplay(textFind[typeChoice][setChoice].content,paramsContent));
							}else{		//If nothing has been found
								content.push('<div class="centerContent">'+getTrad('actions.'+gameState.info.action+'.used',{'player':player,'housemate':participant})+'</div>');
								content.push(discuss(participant.get('pict'),participant.getName(),'PLACEHOLDER'));
							}
					}
				}else{
					let actions = clone(window.database.actions);

					if(gameState.info.trap !== undefined && gameState.info.trap){	//If Trap
						content.push(retrieveLocationTitle());
						let hypnoPict = player.getHypnoFace();
						content.push('<div class="centerContent">'+imgVideo(hypnoPict)+'</div>');
						
						content.push('<div class="centerContent">'+getTrad('activity.trapped.start')+'</div>');
						let listVids = giveHypnoVids(gameState.info.typeHypno);
						let picts = pickRandom(listVids,gameState.info.strengthHypno);
						for(let pictId in picts){
							let pict = picts[pictId];
							content.push('<div class="centerContent">'+getTrad('activity.trapped.strength_'+(parseInt(pictId)+1))+'</div>');
							content.push('<div class="centerContent">'+imgVideo(pict)+'</div>');
						}

						textBtnContinue = getTrad('basic.wakethefuckup');
					}else if(gameState.info.prematuretrigger !== undefined && gameState.info.prematuretrigger){		//If prematuretrigger
						content.push(retrieveLocationTitle());

						content.push('<div class="centerContent">'+getTrad('events.prematuretrigger.content.start')+'</div>');
						content.push(giveDiscussText({"who":"player","pictType":"last"},getTrad('events.prematuretrigger.content.talk')));

						let hypnoPict = player.getHypnoFace();
						content.push('<div class="centerContent">'+imgVideo(hypnoPict)+'</div>');

						let listVids = giveHypnoVids(gameState.info.typeHypno);
						let picts = pickRandom(listVids,gameState.info.strengthHypno);
						for(let pictId in picts){
							let pict = picts[pictId];
							content.push('<div class="centerContent">'+getTrad('activity.trapped.strength_'+(parseInt(pictId)+1))+'</div>');
							content.push('<div class="centerContent">'+imgVideo(pict)+'</div>');
						}

						textBtnContinue = getTrad('basic.wakethefuckup');
					}else{
						if(actions[gameState.info.activity] !== undefined){	//Interact with stuff
							if(actions[gameState.info.activity].type == 'inventory' && setting('pickupobject')){	//Take or Put back Object
								content.push(retrieveLocationTitle());
								if(gameState.info.putBack !== undefined && gameState.info.putBack){				//Put Back
									content.push('<div class="centerContent">'+imgVideo(actions[gameState.info.activity].pictmod)+'</div>');
									content.push('<div class="centerContent">'+getTrad('basic.placedtrap')+'</div>');
								}else{											//Take
									content.push('<div class="centerContent">'+imgVideo(actions[gameState.info.activity].pictbase)+'</div>');
									content.push('<div class="centerContent">'+getTrad('basic.takestuff')+'</div>');
								}
							}else{												//Check Object and Modify it if available
								content.push(retrieveLocationTitle());
								content.push('<div id="actionStart">');
								let pictHere = (actions[gameState.info.activity].pictbase !== undefined ? actions[gameState.info.activity].pictbase : actions[gameState.info.activity].pict );
								content.push('<div class="centerContent">'+imgVideo(pictHere)+'</div>');
								content.push('<div class="centerContent">'+getTrad('actions.'+gameState.info.activity+'.desc')+'</div>');

								if(player.doHave(actions[gameState.info.activity].object)){		//Modify
									let pictUsable = window.database.buyable[actions[gameState.info.activity].object].pict;
									content.push('<div class="actionDoContinue useBtn" data-trapId="'+gameState.info.activity+'" data-location="'+gameState.location+'">'+
															imgVideo(pictUsable)+
															'<span>'+getTrad('actions.'+gameState.info.activity+'.action')+'</span>'+
														'</div>');

									content.push('</div><div id="actionContinue" class="hide">');
									content.push('<div class="centerContent">'+imgVideo(actions[gameState.info.activity].pict)+'</div>');
									content.push('<div class="centerContent">'+getTrad('basic.placedtrap')+'</div>');
								}

								//Display lootable objects
								if(gameState.info.lootable !== undefined && gameState.info.lootable.length > 0){
									for(let lootableId of gameState.info.lootable){
										let lootable = window.database.lootable[lootableId];

										let pictLoot = '';
										if(typeof lootable.pict == 'string')
											pictLoot = lootable.pict;
										else
											pictLoot = pickRandom(lootable.pict);
										content.push('<div class="lootableBtn useBtn" data-id="'+lootableId+'">'+imgVideo(pictLoot)+'<span>'+getTrad(lootable.text)+'</span></div>');
									}
								}

								content.push('</div>');
							}
						}else{										//Doing the Activity
							content.push(retrieveLocationTitle());

							//Choice of pictures for the activity
							let activityDisplaySetting = setting('activitydisplay');
							let pict = null;
							if(activityDisplaySetting == 'action'){
								let picts = infoLocation.activities[gameState.info.activity].picts;
								if(picts === undefined || picts.length == 0){
									pict = player.get('pict');
								}else{
									if(picts.length > 1){
										let idpicts = Math.floor(player.giveExitation() / Math.ceil(100 / picts.length));
										pict = picts[idpicts];
									}else{
										pict = picts[0];
									}
								}
								if(pict !== null)
									content.push('<div class="centerContent">'+imgVideo(pict)+'</div>');
							}else{
								pict = player.giveActivity(gameState.info.activity);
								if(pict === false){
									pict = player.get('pict');
									if(pict !== null)
										content.push('<div class="centerContent">'+imgVideo(pict)+'</div>');
								}else{
									if(player.havePerk('exhibitionist')){
										content.push(getPictuHypno(pict,window.database.perks.exhibitionist.videoHypno,'videoHypnoCamera','slowAnim'));
									}else if(player.havePerk('naturist')){
										content.push(getPictuHypno(pict,window.database.perks.naturist.videoHypno,'videoHypnoCamera','slowAnim'));
									}else{
										content.push('<div class="centerContent">'+imgVideo(pict)+'</div>');
									}
								}
							}
							
							content.push('<div class="centerContent">'+getTrad('activity.'+gameState.info.activity+'.youuse')+'</div>');

							if(!setting('showpoints')){
								if(gameState.info.addVotes !== undefined){
									let textvote = '';
									let infoVote = gameState.info.addVotes;
									if(infoVote.nbVote == 0 && infoVote.occuActivity > 0){
										textvote = getTrad('activity.voteresult.bad');
									}else if(infoVote.occuActivity > 0){
										textvote = getTrad('activity.voteresult.passable',{'nbvote':infoVote.nbVote});
									}else{
										textvote = getTrad('activity.voteresult.good',{'nbvote':infoVote.nbVote});
									}
									content.push('<div class="centerContent">'+textvote+'</div>');
								}
							}
						}
					}
				}
			}
		}else{
			content.push('Something went wrong, you should have some content here...');
		}

		if(!noBtnContinue){
			if(gameState.time == 'nextDay')
				content.push('<div class="centerContent"><a class="btn nextDayBtn">'+getTrad('basic.gotosleep')+'</a></div>');
			else
				content.push('<div class="centerContent"><a class="btn locationBtn" data-location="hallway">'+textBtnContinue+'</a></div>');
		}
		
		getId('main-gamewindow').querySelector('article main').innerHTML = content.join('');
		let from = getStorage('currentPage');
		showPage(from,'main-gamewindow');
	}
	function retrieveEvent(){							//Display an Event
		let gameState = getStorage('gameState');
		let player = getCharacter('player');
		let characterSec = getStorage('characterSec');
		let villa = getStorage('villa');
		let eventKept = gameState.info.eventKept;

		let textBtnContinue = getTrad('basic.moveon');

		let contentDisplay = [];
		let paramsContent = {'player':player};
	
		if(['hallway','activities'].indexOf(eventKept) !== -1){
			let housemate = getCharacter(gameState.info.housemateId);
			let behaviorHere = (typeof forceEventBehavior !== 'undefined' ? forceEventBehavior : housemate.get('behavior'));

			let hypnoType = window.database.behaviors[behaviorHere].hypno;
			if(player.havePerk('crazyworld'))
				hypnoType = 'serious';
			let setKeptHere = gameState.info.setKept;
			let displayInfo = clone(window.database.behaviors[behaviorHere].hypnoDisplay);
			if(gameState.info.setKept.indexOf('defaultSet') !== -1)
				displayInfo = clone(window.database.behaviors.default.hypnoDisplay);
			let setInfo = displayInfo[setKeptHere];

			paramsContent.hypnoType = hypnoType;
			for(let charIndex in gameState.info.housematesId){
				let charId = gameState.info.housematesId[charIndex];
				if(charIndex == 0)
					paramsContent['housemate'] = getCharacter(charId);
				else
					paramsContent['housemate'+(parseInt(charIndex)+1)] = getCharacter(charId);
			}

			//Create Display
			if(setInfo.specificStart !== undefined){
				contentDisplay.push('<h1>'+getTrad(setInfo.specificStart)+'</h1>');
				contentDisplay.push('<div id="eventContinue0">');
			}else{
				contentDisplay.push('<h1>'+getTrad('hypnoTypes.title')+'</h1>');
				contentDisplay.push('<div id="eventContinue0">');
				contentDisplay.push('<div class="centerContent">'+givepictureHypnoHousemate()+'</div>');
			}

			let finish = false;
			for(let blockId of gameState.info.stuffToPlay){
				if(blockId == 'hypnoContinue'){		//Separate start from continue
					contentDisplay.push('<div class="centerContent"><a class="btn btnChange" data-origin="eventContinue0" data-target="eventContinue">'+ucfirst(getTrad('basic.continue'))+'</a></div></div><div id="eventContinue" class="hide">');
				}

				let displayInfo = clone(window.database.behaviors[behaviorHere].hypnoDisplay);
				if(gameState.info.setKept.indexOf('defaultSet') !== -1){
					displayInfo = clone(window.database.behaviors.default.hypnoDisplay);
				}else if(displayInfo[setKeptHere][blockId] === undefined){		//If not found use the by default
					setKeptHere = 'defaultSet1';
					displayInfo = clone(window.database.behaviors.default.hypnoDisplay);
				}

				//Get The content to display
				contentDisplay = arrayConcat(contentDisplay,giveDisplay(displayInfo[setKeptHere][blockId],paramsContent));

				if(blockId == 'counter'){
					for(let counterId of gameState.info.counter){
						if(counterId == 'nimble')
							contentDisplay.push('<div class="centerContent"><a class="btn btnCounter useBtn" data-use="'+counterId+'"><img src="'+window.database.perks[counterId].pict+'"><span>'+getTrad('events.hallway.counter.'+counterId,paramsContent)+'</span></a></div>');
						else
							contentDisplay.push('<div class="centerContent"><a class="btn btnCounter useBtn" data-use="'+counterId+'"><img src="'+window.database.buyable[counterId].pict+'"><span>'+getTrad('events.hallway.counter.'+counterId,paramsContent)+'</span></a></div>');
					}
					if(gameState.info.counter.indexOf('techcomponents') !== -1)
						contentDisplay.push('<div class="centerContent"><a class="btn btnCounter useBtn" data-use="nothing"><img src="data/img/other/do-nothing_woman.jpg"><span>'+getTrad('events.hallway.counter.nothingthing',paramsContent)+'</span></a></div>');
					else
						contentDisplay.push('<div class="centerContent"><a class="btn btnCounter useBtn" data-use="nothing"><img src="data/img/other/do-nothing_woman.jpg"><span>'+getTrad('events.hallway.counter.nothing',paramsContent)+'</span></a></div>');
				}else if(['noHypno','hypnoFinish','distracted'].indexOf(blockId) !== -1 || blockId.indexOf('counterWin') !== -1 || blockId.indexOf('counterFail') !== -1){
					finish = true;
					let textBtnContinue = getTrad('basic.moveon');
					if(blockId == 'hypnoFinish' || blockId.indexOf('counterFail') !== -1)
						textBtnContinue = getTrad('basic.wakethefuckup');

					//Btn to go back
					if(gameState.time == 'nextDay')
						contentDisplay.push('<div class="centerContent"><a class="btn nextDayBtn">'+getTrad('basic.gotosleep')+'</a></div>');
					else
						contentDisplay.push('<div class="centerContent"><a class="btn locationBtn" data-location="hallway">'+textBtnContinue+'</a></div>');

					contentDisplay.push('</div>');
				}
			}		
		}else if(['scientist','scientistfail'].indexOf(eventKept) !== -1){
			let scientistInfo = window.database.characterSec.scientist.set[characterSec.scientist.set];
			contentDisplay.push('<h1>'+getTrad('events.'+eventKept+'.name')+'</h1>');
			contentDisplay.push('<div id="eventContinue0">');
			contentDisplay.push(dualPicture('hallway',scientistInfo.portrait));
		}else if(['accountant','thevoucher'].indexOf(eventKept) !== -1){
			let accountantInfo = window.database.characterSec.accountant.set[characterSec.accountant.set];
			contentDisplay.push('<h1>'+getTrad('events.'+eventKept+'.name')+'</h1>');
			contentDisplay.push('<div id="eventContinue0">');
			contentDisplay.push(dualPicture('hallway',accountantInfo.portrait));
		}else{
			contentDisplay.push('<h1>'+getTrad('events.'+eventKept+'.name')+'</h1>');
			contentDisplay.push('<div id="eventContinue0">');
		}

		//Display if there are some
			let noBtnNext = false;
			let eventInfo = window.database.events[eventKept];
			if(gameState.info.blockToPlay !== undefined){
				let allPartToDisplay = [];
				for(let blockId of gameState.info.blockToPlay){
					if(allPartToDisplay.length > 0)
						allPartToDisplay = arrayConcat(allPartToDisplay,['CONTINUE']);
					allPartToDisplay = arrayConcat(allPartToDisplay,eventInfo.parts[blockId].content);
					noBtnNext = (eventInfo.parts[blockId].noBtnNext !== undefined && eventInfo.parts[blockId].noBtnNext);
				}
				contentDisplay = arrayConcat(contentDisplay,giveDisplay(allPartToDisplay,paramsContent));
			}
		//Btn Continue or to go back
			if(gameState.info.stuffToPlay === undefined && !noBtnNext){	//If not already done in the hallway,activities
				if(gameState.info.continueList !== undefined && gameState.info.continueList.length > 0){
					for(let blockId of gameState.info.continueList){
						let blockInfo = eventInfo.parts[blockId];
						let classList = ['btn btnEventContinue','useBtn'];
						if(blockInfo.addClass !== undefined)
							classList = arrayConcat(classList,blockInfo.addClass);
						let img = (blockInfo.icon !== undefined ? '<img src="'+blockInfo.icon+'">' : '');
						let btn = '<a class="'+classList.join(' ')+'" data-use="'+blockId+'">'+img+'<span>'+getTrad(blockInfo.title)+'</span></a>';
						contentDisplay.push('<div class="centerContent">'+btn+'</div>');
					}
				}else{
					if(gameState.time == 'nextDay')
						contentDisplay.push('<div class="centerContent"><a class="btn nextDayBtn">'+getTrad('basic.gotosleep')+'</a></div>');
					else
						contentDisplay.push('<div class="centerContent"><a class="btn locationBtn" data-location="hallway">'+textBtnContinue+'</a></div>');
				}
			}

		contentDisplay.push('</div>');

		getId('main-gamewindow').querySelector('article main').innerHTML = contentDisplay.join('');
		let from = getStorage('currentPage');
		showPage(from,'main-gamewindow');

		//Scroll To Top
		document.querySelector('main').scrollIntoView();
		window.scrollTo(0, 0);
	}
	function retrieveDailyRecap(){						//Have the dailyRecap
		let gameState = getStorage('gameState');
		let player = getCharacter('player');
		let characterSec = getStorage('characterSec');
		let villa = getStorage('villa');

		//Init
			addClass(getId('dailyDitz'),'hide');
			addClass(getId('dailyDream'),'hide');
			addClass(getId('dailyFun'),'hide');
			addClass(getId('dailyEndless'),'hide');
			addClass(getId('dailyRecap'),'hide');
			addClass(getId('dailyFolio'),'hide');
			removeClass(getId('dailyFolio').querySelector('.locationBtn'),'hide');
			addClass(getId('dailyFolio').querySelector('.btnChange'),'hide');
			addClass(getId('dailyHypno'),'hide');
			addClass(getId('dailyRecap').querySelector('.locationBtn'),'hide');
			addClass(getId('btnChangeFolio'),'hide');
			addClass(getId('btnChangeHypno'),'hide');
			getId('dailyDreamBtn').onclick = function(){afterDream();};

		let contentDisplay = [];

		//Ditz Screen
		if(gameState.info.ditzTrigger !== undefined && gameState.info.ditzTrigger){
			getId('dailyDitz').querySelector('content').innerHTML = '<div class="centerContent">'+imgVideo(pickRandom(clone(window.database.morning.ditzVids)))+'</div>';
			removeClass(getId('dailyDitz'),'hide');
		}

		//Dream
			let dreamObj = getId('dailyDream').dream;
			if(dreamObj === undefined){
				dreamObj = new dream();
				getId('dailyDream').dream = dreamObj;
			}
			dreamObj.display();

		//Manage Funtime
			showFunTime(gameState);

		//Endless New Housemate
			if(gameState.info.newChar !== undefined && gameState.info.newChar.length > 0){
				contentDisplay = [];
				let ianewarrivalDisplay = 'morning.endless.ianewarrival';
				if(gameState.info.newChar.length > 1)
					ianewarrivalDisplay = 'morning.endless.ianewarrivals';
				contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad(ianewarrivalDisplay)));

				contentDisplay.push('<div class="listNewChar">');
				for(let newCharId of gameState.info.newChar){
					let newChar = getCharacter(newCharId);

					let passions = pickRandom(newChar.passions,2);
					for(let passionsId in passions){
						passions[passionsId] = getTrad('profile.passions.'+passions[passionsId]);
					}
					let paramsNewChar = {
						'age':newChar.age,
						'birth':newChar.birthday,
						'hairColor':newChar.hairColor,
						'job':getTrad('profile.jobs.'+newChar.job),
						'passions':passions.join(' and '),
						'city':newChar.city,
						'name':newChar.getName(),
						'firstname':newChar.firstname,
					};

					contentDisplay.push(
										'<div class="newChar">'+
											'<div class="newCharImg">'+imgVideo(newChar.pict)+'</div>'+
											'<div class="newCharText">'+
												'<div class="newCharName">'+newChar.getName()+'</div>'+
												'<div class="newCharDesc">'+getTrad('morning.endless.newchardesc',paramsNewChar)+'</div>'+
											'</div>'+
										'</div>'
										);
				}
				contentDisplay.push('</div>');

				getId('dailyEndless').querySelector('content').innerHTML = contentDisplay.join('');
			}
	
		//Manage Recap
			contentDisplay = [];
			contentDisplay.push('<div class="newdayPict"><div class="centerContent">'+imgVideo(pickRandom(clone(window.database.morning.newdayPict)))+'</div></div>');

			let html = getTrad('morning.start');
			if(player.havePerk('morninglark'))
				html = getTrad('morning.startdawn');
			if(player.havePerk('hairperfectionist'))
				html += getTrad('morning.hair');
			if(player.doHave('makeup'))
				html += getTrad('morning.makeup');
			html += getTrad('morning.finish')
			contentDisplay.push('<div class="justifyContent">'+html+'</div>');

			//If change cloth in dream
				if(gameState.info.changeCloth !== undefined){
					contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('morning.changeCloth.'+gameState.info.changeCloth,player)));
					contentDisplay.push('<div class="centerContent">'+imgVideo(player.picturesTypes(gameState.info.changeCloth)[0])+'</div>');
				}else{
					contentDisplay.push('<div id="dreamChangeCloth" class="centerContent"></div>');
				}

			//HouseMates
				let textMorning = getTrad('morning.housemates.hello');
				if(player.havePerk('morninglark'))
					textMorning = getTrad('morning.housemates.hellodawn');
				if(gameState.info.funtimeId !== undefined && gameState.info.funtimeId !== null)
					textMorning = getTrad('morning.housemates.havingfun');
				contentDisplay.push('<hr>');
				contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,textMorning));
				let participants = getStorage('characters');
				html = '<ul class="recapList">';
				for(let participantId in participants){
					if(participantId == 'player')
						continue;
					let participant = getCharacter(participantId);
					if(player.mod !== undefined && player.mod.endless && participant.out)
						continue;
					if(participant.get('out') !== undefined && participant.get('out')){
						html += '<li><div class="recapPicture">'+imgVideo(participant.get('pict'))+'</div><div class="recapText warnThing">'+getTrad('morning.housemates.out',participant)+'</div></li>';
					}else if(gameState.info.haveCheckmate !== undefined && gameState.info.haveCheckmate == participantId){
						html += '<li><div class="recapPicture">'+imgVideo(participant.get('pict'))+'</div><div class="recapText warnThing">'+getTrad('events.checkmate.text',{'player':player,'housemate':participant})+'</div></li>';
					}else{
						html += '<li><div class="recapPicture">'+imgVideo(participant.get('pict'))+'</div><div class="recapText">'+getTrad('morning.housemates.stage'+participant.get('stage'),participant)+'</div></li>';
					}
				}
				html += '</ul>';
				contentDisplay.push('<div class="justifyContent">'+html+'</div>');

				//Show Votes per stage
				if(gameState.info.addVotesCorruption !== undefined && gameState.info.addVotesCorruption.nbVote > 0){
					if(setting('showpoints'))
						contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('morning.housemates.pointawarded') ));
					else
						contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('morning.housemates.pointawarded2',{'nbvote':gameState.info.addVotesCorruption.nbVote}) ));
				}

				if(gameState.info.haveShuffle !== undefined && gameState.info.haveShuffle){
					contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('events.shuffle.text')));
				}

			//Show Votes of Fans
				if(setting('fanfeature') && gameState.info.fansVotes !== undefined && gameState.info.fansVotes > 0){
					contentDisplay.push('<hr>');
					if(setting('showpoints'))
						contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('morning.fans.pointawarded') ));
					else
						contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].laughing)),characterSec.ia.name,getTrad('morning.fans.pointawarded2',{'nbvote':gameState.info.fansVotes}) ));
				}

			//Player
				let textPlayerDoing = getTrad('morning.playerdoing');

				let perksArch = window.database.participants[player.archetype].perks;
				if(gameState.info.mentionId !== undefined && testTrad('perks.'+perksArch[0]+'.transform.mention'+gameState.info.mentionId)){
					textPlayerDoing = getTrad('morning.transfo.mention'+gameState.info.mentionId)+getTrad('perks.'+perksArch[0]+'.transform.mention'+gameState.info.mentionId,{"typeBody":player.get('typeBody'),"hairColor":player.get('hairColor')});
				}
				contentDisplay.push('<hr>');
				contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,textPlayerDoing));

				html = '<ul class="recapList">';

				//Head
					let states = window.database.morning.states;
					let statesKept = [];
					for(let stateTypeId in states){
						let valuePlayer = Math.round(player.get(stateTypeId));
						for(let part of states[stateTypeId]){
							if(part.min <= valuePlayer && valuePlayer <= part.max){
								statesKept.push(getTrad('morning.states.'+part.id));
								break;
							}
						}
					}
					if(player.get('starting')["archetype"] != player.get('archetype')){
						//TODO add to statesKept if face change
					}
					html += '<li><div class="recapPicture">'+imgVideo(player.get('pict'))+'</div><div class="recapText">'+statesKept.join('<hr>')+'</div></li>';

				//Boobs
					let sizeBoobs = player.get('sizeBoobs');
					if(player.get('starting')["torsoType"] != player.get('sizeBoobs'))
						sizeBoobs += 'mod';
					let picturesBoobs = player.picturesTypes('topCloth');
					let pictureBoobs = picturesBoobs[picturesBoobs.length - 1];
					html += '<li><div class="recapPicture">'+imgVideo(pictureBoobs)+'</div><div class="recapText">'+getTrad('morning.boobs.'+sizeBoobs)+'</div></li>';

				//Cloth
					let bottomType = player.get('bottomType');
					let picturesBottom = player.picturesTypes('bottomCloth')
					let pictureBottom; let textHere;
					if(player.havePerk('exhibitionist')||player.havePerk('naturist')){
						pictureBottom = picturesBottom[picturesBottom.length-1];
						textHere = getTrad('morning.cloth.naked');
					}else{
						pictureBottom = picturesBottom[0];
						textHere = getTrad('morning.cloth.'+bottomType);
					}
					html += '<li><div class="recapPicture">'+imgVideo(pictureBottom)+'</div><div class="recapText">'+textHere+'</div></li>';

				html += '</ul>';
				contentDisplay.push('<div class="justifyContent">'+html+'</div>');

				//Craving
					let craving = window.database.needbuy;
					for(let crave of craving){

						//Find the object and look if you can buy another one
						let itemGood = true;
						for(let itemId in player.get('inventory')){
							let item = player.get('inventory')[itemId];
							if(item.stage !== undefined && item.crave == crave){
								if(item['pictStage'+(item.stage+1)] === undefined){
									itemGood = false;
								}
							}
						}

						if(itemGood && parseInt(player.get(crave)) >= window.database.difficulty[getStorage('difficulty')].craveCounter){
							let params = {"firstname":player.get('firstname'),"voteCost":getPrice()};
							contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('morning.needbuy.'+crave,params)));
						}
					}

				//If Stage new Profile
					if(gameState.info.changeStage !== undefined && gameState.info.changeStage.length > 0){
						let baseText = 'changestage.';
						let iaReact = 'laughing';
						if(player.havePerk('crazyworld')){
							baseText = 'crazyworld.changestage.';
							iaReact = 'upset';
						}
						for(let typeChange of gameState.info.changeStage){
							let textChange = [getTrad(baseText+'base',player), getTrad(baseText+typeChange,player), getTrad(baseText+'final',player)].join(' ');
							contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set][iaReact])),characterSec.ia.name,textChange));
							
						}
					}

				//Behavior
					html = '<hr><h2>'+getTrad('morning.behavior')+':</h2>';
					html += '<ul id="perksList" class="recapList"></ul>';
					contentDisplay.push('<div class="justifyContent">'+html+'</div>');

			removeClass(getId('dailyRecap').querySelector('.locationBtn'),'hide');
			getId('dailyRecap').querySelector('content').innerHTML = contentDisplay.join('');

			//Show the perks
				getId('perksList').innerHTML = dailyRecapPerks(gameState);
				renderStuff();

			if(haveClass(getId('dailyDitz'),'hide') && haveClass(getId('dailyDream'),'hide') && haveClass(getId('dailyFun'),'hide') && haveClass(getId('dailyEndless'),'hide'))
				removeClass(getId('dailyRecap'),'hide');

		//Other Stuff
			if(gameState.info.pickOtherStuff !== undefined){
				let infoEvent = window.database.events[gameState.info.pickOtherStuff];
				contentDisplay = [];
				if(infoEvent.display !== undefined){
					for(let elem of infoEvent.display){
						if(elem == 'ACCOUNTANTFILES'){
							let files = [];
							for(let file of infoEvent.picts[characterSec.accountant.set].folio){
								files.push(imgVideo(file));
							}
							contentDisplay.push('<div class="displayFolio">'+files.join('')+'</div>');
						}else if(elem.who !== undefined){
							contentDisplay.push(giveDiscussText(elem,getTrad(elem.text)));
						}
					}

					addClass(getId('dailyRecap').querySelector('.locationBtn'),'hide');
					removeClass(getId('btnChangeFolio'),'hide');

					getId('dailyFolio').querySelector('content').innerHTML = contentDisplay.join('');
				}
			}

		//Manage Adjustments
			if(gameState.info.hypnoChoosed !== undefined){
				contentDisplay = [];

				let listVids = giveHypnoVids(gameState.info.hypnoChoosed);
				let vids = pickRandom(listVids,2);
				let hypnoPict = player.getHypnoFace();
				let continues = getTrads('hypnoTypes.'+gameState.info.hypnoChoosed+'.continue',2);

				contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('morning.adjustments.start',player)));
				contentDisplay.push('<div class="centerContent">'+getTrad('morning.adjustments.screen')+'</div>');
				contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('hypnoTypes.'+gameState.info.hypnoChoosed+'.morning.start')));
				contentDisplay.push('<div class="centerContent">'+imgVideo(vids[0])+'</div>');
				contentDisplay.push(discuss(hypnoPict,majText(getTrad('basic.you')),continues[0]));
				contentDisplay.push('<div class="centerContent">'+imgVideo(vids[1])+'</div>');
				contentDisplay.push(discuss(hypnoPict,majText(getTrad('basic.you')),continues[1]));
				contentDisplay.push(discuss(pickRandom(clone(window.database.characterSec.ia.set[characterSec.ia.set].speaking)),characterSec.ia.name,getTrad('hypnoTypes.'+gameState.info.hypnoChoosed+'.morning.end')));
				contentDisplay.push('<div class="centerContent">'+getTrad('morning.adjustments.end')+'</div>');

				if(getId('dailyFolio').querySelector('content').innerHTML !== ''){
					addClass(getId('dailyFolio').querySelector('.locationBtn'),'hide');
					removeClass(getId('dailyFolio').querySelector('.btnChange'),'hide');
				}else{
					addClass(getId('dailyRecap').querySelector('.locationBtn'),'hide');
					removeClass(getId('btnChangeHypno'),'hide');
				}
				getId('dailyHypno').querySelector('content').innerHTML = contentDisplay.join('');
			}

		//If the main page is already displayed
		if(!haveClass(getId('dailyRecap'),'hide')){
			if(gameState.info.addVotesCorruption !== undefined)
				popupVotes(gameState.info.addVotesCorruption);
			if(gameState.info.fansVotes !== undefined)
				popupVotes({'nbVote':gameState.info.fansVotes});
		}

		let from = getStorage('currentPage');
		showPage(from,'dailyPage');
	}
	function retrieveEndGame(){							//Show the EndGame
		function giveStats(){
			let player = getCharacter('player');
			let gameState = getStorage('gameState');

			let contentDisplay = [];

			let tmpFace = Object.keys(window.database.participants[player.archetype].picts);
			tmpFace = tmpFace[0];
			pictFirst = window.database.participants[player.archetype].picts[tmpFace];

			contentDisplay.push('<div id="statsContents">');

			contentDisplay.push('<div class="statsDiv statsDifficulty"><h2><u>'+getTrad('newgame.difficulty.title')+':</u> '+getTrad('newgame.difficulty.'+getStorage('difficulty'))+'</h2></div>');

			//Some Numbers
				contentDisplay.push('<div class="headStats ">'+
									'<div class="statsDiv"><u>'+getTrad('stats.nbdaypassed')+':</u> <br>'+gameState.dayNumber+'</div>'+
									'<div class="statsDiv"><u>'+getTrad('stats.nbloadgame')+':</u> '+player.stats.loadgame+'</div>'+
									'<div class="statsDiv">'+
										'<u>'+getTrad('stats.totalvotegain')+':</u> '+player.stats.totalVoteGain+'<br>'+
										'<u>'+getTrad('stats.totalvotespend')+':</u> '+player.stats.totalVoteSpend+'<br>'+
										'<u>'+getTrad('stats.totalfansgain')+':</u> '+player.stats.totalFansGain+
									'</div>'+
								'</div>');

			//Body
				let pictsBoobsList = player.picturesTypes('topCloth');
				let pictsBottomsList = player.picturesTypes('bottomCloth');
				let bodyPart = [];
				bodyPart.push('<img src="'+player.starting.face+'">');
				bodyPart.push('<img src="'+player.starting.torsoPict+'">');
				bodyPart.push('<img src="'+player.starting.bottomPict+'">');
				contentDisplay.push('<div id="oldBody" class="bodyShow statsDiv">'+bodyPart.join('')+'</div>');

				bodyPart = [];
				if(player.havePerk('crazyworld'))
					bodyPart.push('<img src="'+window.database.participants[player.archetype].picts.out+'">');
				else
					bodyPart.push('<img src="'+window.database.participants[player.archetype].picts.base+'">');
				bodyPart.push('<img src="'+pictsBoobsList[pictsBoobsList.length -1]+'">');
				bodyPart.push('<img src="'+pictsBottomsList[pictsBottomsList.length -1]+'">');
				contentDisplay.push('<div id="newBody" class="bodyShow statsDiv">'+bodyPart.join('')+'</div>');

			contentDisplay.push('<div class="subStatsContents">');

			//Identity
				contentDisplay.push('<div id="oldName" class="statsDiv">'+
									'<u>'+getTrad('stats.name')+':</u> '+player.firstnameMan+' '+player.lastname+'<br>'+
									'<u>'+getTrad('stats.showname')+':</u> '+player.firstname+' '+player.lastname+
								'</div>');
				contentDisplay.push('<div id="currentName" class="statsDiv">'+
									'<u>'+getTrad('stats.oldname')+':</u> '+player.firstnameMan+' '+player.lastname+'<br>'+
									'<u>'+getTrad('stats.name')+':</u> '+player.firstname+' '+player.lastname+
								'</div>');
				contentDisplay.push('<div id="onlyName" class="statsDiv">'+
									'<u>'+getTrad('stats.name')+':</u> '+player.firstname+' '+player.lastname+
								'</div>');

				contentDisplay.push('<div id="oldGender" class="statsDiv">'+
									'<u>'+getTrad('stats.gender')+':</u> '+ucfirst(getTrad('basic.gender.man'))+'<br>'+
									'<u>'+getTrad('stats.temporarygender')+':</u> '+ucfirst(getTrad('basic.gender.woman'))+
								'</div>');
				contentDisplay.push('<div id="currentGender" class="statsDiv">'+
									'<u>'+getTrad('stats.previousgender')+':</u> '+ucfirst(getTrad('basic.gender.man'))+'<br>'+
									'<u>'+getTrad('stats.gender')+':</u> '+ucfirst(getTrad('basic.gender.woman'))+
								'</div>');
				contentDisplay.push('<div id="onlyGender" class="statsDiv">'+
									'<u>'+getTrad('stats.gender')+':</u> '+ucfirst(getTrad('basic.gender.woman'))+
								'</div>');
				if(player.age !== player.starting.age){
					contentDisplay.push('<div class="statsDiv">'+
									'<u>'+getTrad('stats.previousage')+':</u> '+player.starting.age+'<br>'+
									'<u>'+getTrad('stats.currentage')+':</u> '+player.age+
								'</div>');
				}else{
					contentDisplay.push('<div class="statsDiv">'+
										'<u>'+getTrad('stats.age')+':</u> '+player.age+
									'</div>');
				}

			//Data

				let textData = {};
				let dataToCheck = ['slut','bimbo'];
				for(let id of dataToCheck){
					let value = player.get(id);
					if(value < 25){
						textData[id] = getTrad('stats.data.'+id+'.low');
					}else if(value < 50){
						textData[id] = getTrad('stats.data.'+id+'.normal');
					}else if(value < 75){
						textData[id] = getTrad('stats.data.'+id+'.high');
					}else if(value < 90){
						textData[id] = getTrad('stats.data.'+id+'.substantial');
					}else{
						textData[id] = getTrad('stats.data.'+id+'.crazy');
					}
				}
				dataToCheck = ['slutStage','bimboStage'];
				for(let id of dataToCheck){
					let value = player.get(id);
					textData[id] = getTrad('stats.data.'+id+'.'+value);
				}

				let nbStage = Object.keys(window.database.stagePlayerThreshold).length + 1;
				contentDisplay.push('<div class="statsDiv statsBars">');
					contentDisplay.push('<h2>'+getTrad('stats.state')+':</h2>');
					contentDisplay.push('<div class="barSlut barMeter">'+
											'<div class="barText"><span class="barTextSpan">'+ucfirst(getTrad('basic.slut'))+': '+player.get('slut').toFixed(0)+'/100'+'</span></div>'+
											'<span class="barBar" style="width:'+Math.round(player.get('slut')*100/100)+'%"></span>'+
										'</div>');
					contentDisplay.push(textData.slut);
					contentDisplay.push('<div class="barSlut barMeter">'+
											'<div class="barText"><span class="barTextSpan">'+ucfirst(getTrad('basic.stage'))+': '+player.get('slutStage').toFixed(0)+'/'+nbStage+'</span></div>'+
											'<span class="barBar" style="width:'+Math.round(player.get('slutStage')*100/nbStage)+'%"></span>'+
										'</div>');
					contentDisplay.push(textData.slutStage);

					contentDisplay.push('<hr>');

					contentDisplay.push('<div class="barBimbo barMeter">'+
											'<div class="barText"><span class="barTextSpan">'+ucfirst(getTrad('basic.bimbo'))+': '+player.get('bimbo').toFixed(0)+'/100'+'</span></div>'+
											'<span class="barBar" style="width:'+Math.round(player.get('bimbo')*100/100)+'%"></span>'+
										'</div>');
					contentDisplay.push(textData.bimbo);
					contentDisplay.push('<div class="barBimbo barMeter">'+
											'<div class="barText"><span class="barTextSpan">'+ucfirst(getTrad('basic.stage'))+': '+player.get('bimboStage').toFixed(0)+'/'+nbStage+'</span></div>'+
											'<span class="barBar" style="width:'+Math.round(player.get('bimboStage')*100/nbStage)+'%"></span>'+
										'</div>');
					contentDisplay.push(textData.bimboStage);
				contentDisplay.push('</div>');

			contentDisplay.push('</div>');

			//Perks
				let perksList = [];
				let perks = player.get('perks');
				for(let perk of perks){
					let infoPerk = getTrad('perks.'+perk+'.effect');
					if(infoPerk === 'perks.'+perk+'.effect' || infoPerk === undefined)
						infoPerk = false;
					let perkPict = window.database.perks[perk].pict;
					if(window.database.perks[perk].pictman !== undefined)
						perkPict = window.database.perks[perk]['pict'+player.gender];
					perksList.push('<li>'+
								'<div class="recapPicture"><img src="'+perkPict+'"></div>'+
								'<div class="recapText">'+
									'<b>'+getTrad('perks.'+perk+'.name')+'</b>:<hr class="title">'+getTrad('perks.'+perk+'.desc')+
									(infoPerk !== false ? '<br><i>'+infoPerk+'</i>' : '')+
								'</div>'+
							'</li>');
				}
				contentDisplay.push('<div class="statsDiv"><h2>'+getTrad('stats.perks')+':</h2><ul class="recapList">'+perksList.join('')+'</ul></div>');


			//Other Numbers
				contentDisplay.push('<div class="statsDiv">'+
										'<u>'+getTrad('stats.trapsetup')+':</u> '+player.stats.trapSetup+'<br>'+
										'<u>'+getTrad('stats.trapsuccess')+':</u> '+player.stats.trapSuccess+'<br>'+
										'<u>'+getTrad('stats.trapyourself')+':</u> '+player.stats.trapYourself+
									'</div>');

				let tmpContent = ['<u>'+getTrad('stats.masturb')+':</u> '+player.stats.masturbated];
				if(player.stats.nbBlowjobs !== undefined && player.stats.nbBlowjobs > 0)
					tmpContent.push('<u>'+getTrad('stats.bjgiven')+':</u> '+player.stats.nbBlowjobs);
				if(player.stats.nbSex !== undefined && player.stats.nbSex > 0)
					tmpContent.push('<u>'+getTrad('stats.sexhad')+':</u> '+player.stats.nbSex);
				contentDisplay.push('<div class="statsDiv">'+tmpContent.join('<br>')+'</div>');
				if(player.stats.totalSlutGain !== undefined){
					contentDisplay.push('<div class="statsDiv">'+
												'<u>'+getTrad('stats.nbslutpts')+':</u> '+Math.round(player.stats.totalSlutGain)+'<br>'+
												'<u>'+getTrad('stats.nbbimbopts')+':</u> '+Math.round(player.stats.totalBimboGain)+
										'</div>');
				}
				contentDisplay.push('<div class="statsDiv"><u>'+getTrad('stats.nbhousemate')+':</u> '+(getHousemateId('all').length)+'</div>');
				

			//AI & Housemates
				let housemates = getHousemateId('all');
				for(let houseId of housemates){
					let housemate = getCharacter(houseId);

					let contentHere = [];
					let stateHousemate = '<b><u>'+getTrad('stats.state')+':</u></b> '+housemate.stage+'/'+window.database.difficulty[getStorage('difficulty')].nbStage;
					if(housemate.dateOut !== undefined)
						stateHousemate += ' => '+getTrad('basic.housemateout',housemate).replace('<br>',' ');
					contentHere.push(stateHousemate);
					if(player.stats.participateActivity[houseId] !== undefined){
						let activities = [];
						for(let actiId in player.stats.participateActivity[houseId]){
							activities.push('<li><u>'+getTrad('activity.'+actiId+'.title')+':</u> '+player.stats.participateActivity[houseId][actiId]+'</li>');
						}
						contentHere.push('<b><u>'+getTrad('stats.activities')+':</u></b><ul style="column-count: 3;">'+activities.join('')+'</ul>');
					}
					if(player.stats.ambush[houseId] !== undefined){
						let ambushes = [];
						for(let lvl of window.database.hypnoTypesLvl){
							if(player.stats.ambush[houseId][lvl] !== undefined)
								ambushes.push('<li><u>'+ucfirst(getTrad('hypnoTypes.type.'+lvl))+':</u> '+player.stats.ambush[houseId][lvl]+'</li>');
						}
						contentHere.push('<b><u>'+getTrad('stats.ambushes')+':</u></b><ul style="column-count: 2;">'+ambushes.join('')+'</ul>');
					}

					contentDisplay.push(giveDiscussText({"who":"housemate","pictType":"pict"},contentHere.join('<hr>'),{'housemate':housemate}));
				}

				let aicontent = [];
				if(Object.keys(player.stats.aimessing).length > 0){
					let elems = [];
					for(let id in player.stats.aimessing){
						elems.push('<li><u>'+ucfirst(getTrad('basic.'+id))+':</u> '+player.stats.aimessing[id]+'</li>');
					}
					aicontent.push('<b><u>'+getTrad('stats.aimessing')+':</u></b><ul style="column-count: 2;">'+elems.join('')+'</ul>');
				}
				if(Object.keys(player.stats.dreams).length > 0){
					aicontent.push('<b><u>'+getTrad('stats.induceddreams')+':</u></b> '+Object.keys(player.stats.dreams).length);
				}

				if(aicontent.length > 0)
					contentDisplay.push(giveDiscussText({"who":"ia"},aicontent.join('<hr>')));

			//Dreams
				if(Object.keys(player.stats.dreams).length > 0){
					contentDisplay.push('<div class="statsDiv">');
						contentDisplay.push('<h2>'+getTrad('stats.dreams')+':</h2><div class="statsDreams">');
						for(let dreamId in player.stats.dreams){
							let pict = player.stats.dreams[dreamId];
							getId('storyPage').innerHTML = '<img id="getSize" src="'+pict+'">';
							let typeImg = (getId('getSize').naturalHeight > 230 ? 'dreamHigh' : 'dreamLarge');
							if(pict.indexOf('.mp4') !== -1)
								contentDisplay.push('<div class="dream"><video src="'+pict+'" loop="loop" autoplay="autoplay"></video><div class="dreamName '+typeImg+'">'+getTrad('morning.dreams.'+dreamId+'.title')+'</div></div>');
							else
								contentDisplay.push('<div class="dream"><img src="'+pict+'"><div class="dreamName '+typeImg+'">'+getTrad('morning.dreams.'+dreamId+'.title')+'</div></div>');
						}
					contentDisplay.push('</div></div>');
				}

			//Solo Activities
				if(Object.keys(player.stats.soloActivity).length > 0){
					let elems = [];
					for(let id in player.stats.soloActivity){
						elems.push('<li><u>'+getTrad('activity.'+id+'.title')+':</u> '+player.stats.soloActivity[id]+'</li>');
					}
					contentDisplay.push('<div class="statsDiv"><h2>'+getTrad('stats.soloactivity')+':</h2><ul style="column-count: 3;">'+elems.join('')+'</ul></div>');
				}

			//Other Events
				if(Object.keys(player.stats.eventOtherEncountered).length > 0){
					let elems = [];
					for(let id in player.stats.eventOtherEncountered){
						elems.push('<li><u>'+getTrad('events.'+id+'.name')+':</u> '+player.stats.eventOtherEncountered[id]+'</li>');
					}
					contentDisplay.push('<div class="statsDiv"><h2>'+getTrad('stats.eventencountered')+':</h2><ul style="column-count: 3;">'+elems.join('')+'</ul></div>');
				}

			//Transformated
				if(Object.keys(player.stats.archetypeUsed).length > 0){
					contentDisplay.push('<div class="statsDiv">');
						contentDisplay.push('<h2>'+getTrad('stats.appearance')+':</h2><div class="statsAppearance">');
						for(let id in player.stats.archetypeUsed){
							let name = window.database.participants[id].name;
							let pict = (player.havePerk('crazyworld') ? window.database.participants[id].picts.out : window.database.participants[id].picts.base);
							contentDisplay.push('<div class="appearance"><img src="'+pict+'"><div class="appearanceName"><u>'+name+':</u> '+player.stats.archetypeUsed[id]+'</div></div>');
						}
					contentDisplay.push('</div></div>');
				}

			//Items Bought
				if(Object.keys(player.stats.objectBuy).length > 0){
					contentDisplay.push('<div class="statsDiv">');
						contentDisplay.push('<h2>'+getTrad('stats.itemsbought')+':</h2><ul>');
						for(let id in player.stats.objectBuy){
							let name = getTrad('buyable.'+id+'.name');
							contentDisplay.push('<li><u>'+name+':</u> '+player.stats.objectBuy[id])+'</li>';
						}
					contentDisplay.push('</ul></div>');
				}

			//Cheats
				if(player.stats.cheats !== undefined && Object.keys(player.stats.cheats).length > 0){
					contentDisplay.push('<div class="statsDiv">');
						contentDisplay.push('<h2>'+getTrad('stats.cheatused')+':</h2><ul>');
						for(let id in player.stats.cheats){
							if(player.stats.cheats[id] <= 0)
								continue;
							let name = ucfirst(id);
							contentDisplay.push('<li><u>'+name+':</u> '+player.stats.cheats[id])+'</li>';
						}
					contentDisplay.push('</ul></div>');
				}

				if(player.stats.dayWithoutCheating !== undefined)
					contentDisplay.push('<div class="statsDiv"><u>'+getTrad('stats.daywithoutcheat')+':</u> '+player.stats.dayWithoutCheating+'</div>');
				

			contentDisplay.push('</div>');				

			return contentDisplay.join('');
		}

		function pageSwitchEnding(elem){

			let contentDisplay = [];
			contentDisplay.push('<div class="centerContent">');

			if(elem.linkBack !== undefined)
				contentDisplay.push('<a class="btn endingPageBtn" data-current="'+elem.linkFrom+'" data-to="'+elem.linkBack+'"><span class="icon icon-goback"></span>'+getTrad('main.back')+'</a>');
			if(elem.linkNext !== undefined)
				contentDisplay.push('<a class="btn endingPageBtn" data-current="'+elem.linkFrom+'" data-to="'+elem.linkNext+'">'+getTrad('main.continue')+'<span class="icon icon-goon"></span></a>');

			contentDisplay.push('</div>');

			return contentDisplay.join('');
		}

		function subContentEnding(sets){

			let contentDisplay = [];

			let pickSet = pickRandom(Object.keys(sets));
			let contents = sets[pickSet];
			for(let pageId in contents){
				if(pageId == 0)
					contentDisplay.push('<div class="page" id="endingPage'+pageId+'">');
				else
					contentDisplay.push('<div class="page hide" id="endingPage'+pageId+'">');

				for(let elem of contents[pageId]){

					if(elem.conditions !== undefined && !checkCond(elem.conditions))
						continue;

					let contentHere = null;
					if(elem.linkFrom !== undefined && (elem.linkNext !== undefined||elem.linkBack !== undefined) ){
						contentDisplay.push(pageSwitchEnding(elem));
						continue;
					}else if(typeof elem == 'string' && window.database.ending.assets[elem] !== undefined){
						let vidLoosingIt = pickRandom(window.database.ending.assets[elem].default.default);
						if(window.database.ending.assets[elem][player.hairColor] !== undefined && Object.keys(window.database.ending.assets[elem][player.hairColor]).length > 0){
							if(window.database.ending.assets[elem][player.hairColor].default !== undefined && window.database.ending.assets[elem][player.hairColor].default.length > 0)
								vidLoosingIt = pickRandom(window.database.ending.assets[elem][player.hairColor].default);
							if(window.database.ending.assets[elem][player.hairColor][player.sizeboobs] !== undefined && window.database.ending.assets[elem][player.hairColor][player.sizeboobs].length > 0)
								vidLoosingIt = pickRandom(window.database.ending.assets[elem][player.hairColor][player.sizeboobs]);
						}
						contentDisplay.push('<div class="centerContent">'+imgVideo(vidLoosingIt)+'</div>');
						continue;
					}else if(elem == 'BEDROOMPICT'){
						let villa = getStorage('villa');
						contentDisplay.push('<div class="centerContent">'+imgVideo(villa.bedrooms.player.pict)+'</div>');
						continue;
					}else if(elem == 'TRANSFORMBACK'){

						let pictsBoobsList = player.picturesTypes('topCloth');
						let pictsBottomsList = player.picturesTypes('bottomCloth');

						let transfo = [];
						transfo.push(getTransfo(window.database.participants[player.archetype].picts.base,player.starting.face));
						transfo.push(getTransfo(pictsBoobsList[pictsBoobsList.length -1],player.starting.torsoPict));
						transfo.push(getTransfo(pictsBottomsList[pictsBottomsList.length -1],player.starting.bottomPict));

						contentDisplay.push('<div class="bodyShow">'+transfo.join('')+'</div>');

						continue;
					}else if(elem == 'TRANSFORMBACKCRAZYWORLD'){
						let typeBack = (player.bimbo < 25 && player.bimboStage <= 2 ? 'starting' : 'startingCrazyworld');
						let pictsBoobsList = player.picturesTypes('topCloth');
						let pictsBottomsList = player.picturesTypes('bottomCloth');

						let transfo = [];
						transfo.push(getTransfo(window.database.participants[player.archetype].picts.base,player[typeBack].face));
						transfo.push(getTransfo(pictsBoobsList[pictsBoobsList.length -1],player[typeBack].torsoPict));
						transfo.push(getTransfo(pictsBottomsList[pictsBottomsList.length -1],player[typeBack].bottomPict));

						contentDisplay.push('<div class="bodyShow">'+transfo.join('')+'</div>');

						continue;
					}else if(elem == 'HYPNOCRAZYWORLD'){
						if(player.bimbo >= 25 || player.bimboStage > 2){
							let hypnoBimbo = pickRandom(clone(window.database.hypnoTypes.bimbo.vids));
							contentDisplay.push('<br class="clear"><div class="centerContent">'+imgVideo(hypnoBimbo)+'</div>');
							continue;
						}
					}else if(elem.text !== undefined)
						contentHere = getTrad(elem.text,{'player':player});
					else if(elem.media !== undefined)
						contentHere = elem.media;

					if(contentHere !== null || elem.raw !== undefined)
						contentDisplay.push(giveDiscussText(elem,contentHere));
				}

				contentDisplay.push('</div>');
			}

			//Stats
			contentDisplay.push('<div class="page hide" id="endingStats">');
				contentDisplay.push(giveStats());

				contentDisplay.push('<div class="centerContent">');
				contentDisplay.push('<a class="btn endingPageBtn" data-current="endingPage'+(contents.length)+'" data-to="endingPage'+(contents.length-1)+'"><span class="icon icon-goback"></span>'+getTrad('main.back')+'</a>');
				contentDisplay.push('<a id="endingFinalBtn" class="btn btn-success">'+getTrad('basic.close')+'<span class="icon icon-in"></span></a>');
				contentDisplay.push('</div>');
			contentDisplay.push('</div>');

			return contentDisplay.join('');
		}

		function contentEnding(type,titleTrad){

			let contentDisplay = [];

			let partsAvailable = window.database.ending[type];
			for(let partId in partsAvailable){
				let final = partsAvailable[partId];
				if(final.conditions === undefined || final.conditions.length == 0 || checkCond(final.conditions)){

					contentDisplay.push('<h1>'+getTrad(titleTrad)+'</h1>');
					contentDisplay.push('<div id="ending">');

						contentDisplay.push(subContentEnding(window.database.ending[type][partId].contents));

					contentDisplay.push('</div>');

					break;
				}
			}

			return contentDisplay;
		}

		let player = getCharacter('player');
		let contentDisplay = [];
		window.scrollTo(0, 0);
		let typeAchievements = null;
		if((getHousemateId('notout').length == 0)){
			contentDisplay = contentEnding('wins','ending.thatsit');
			typeAchievements = 'wins';
		}else{
			contentDisplay = contentEnding('loses','ending.somethinghappening');
			typeAchievements = 'loses';
		}

		getId('storyPage').innerHTML = contentDisplay.join('');

		//Btn swtich part Continue / Next
		let changeSteps = getId('ending').getElementsByClassName('endingPageBtn');
		changeSteps = Array.prototype.slice.call( changeSteps );
		changeSteps.forEach(function(element){
			element.onclick = function() {

				let allPages = getId('ending').getElementsByClassName('page');
				for(let page of allPages){
					addClass(page,'hide');
				}
				let idOther = this.getAttribute('data-to');
				let idCurrent = this.getAttribute('data-current');
				if(idOther != null){
					elem = getId(idOther);
					window.scrollTo(0, 0);
					removeClass(elem,'hide');
				}

				//Stats Control
				if(idOther == 'endingStats'){

					let player = getCharacter('player');

					addClass(getId('oldBody'),'hide');
					addClass(getId('newBody'),'hide');

					addClass(getId('oldName'),'hide');
					addClass(getId('currentName'),'hide');
					addClass(getId('onlyName'),'hide');

					addClass(getId('oldGender'),'hide');
					addClass(getId('currentGender'),'hide');
					addClass(getId('onlyGender'),'hide');

					if(idCurrent == 'endingPageRedBox'){
						removeClass(getId('oldBody'),'hide');
					}else{
						removeClass(getId('newBody'),'hide');
					}
					if(player.wasMan){
						if(idCurrent == 'endingPageRedBox'){
							removeClass(getId('oldName'),'hide');
							removeClass(getId('oldGender'),'hide');
						}else{
							removeClass(getId('currentName'),'hide');
							removeClass(getId('currentGender'),'hide');
						}
					}else{
						removeClass(getId('onlyName'),'hide');
						removeClass(getId('onlyGender'),'hide');
					}
				}

				window.scrollTo(0, 0);
			};
		});
		getId('endingFinalBtn').onclick = function(){
			getId('gameContent').querySelector('main').innerHTML = '';
			let from = getStorage('currentPage');
			showPage(from,'main-menu');

			clearPage();
			cleanStorage();
			manageMenu();
			window.scrollTo(0, 0);
		};

		let from = getStorage('currentPage');
		showPage(from,'storyPage');

		//Test Achievements
		let achievementsvWin = testAchievement(typeAchievements);
		if(achievementsvWin.length > 0){
			let countAchievement = 0;
			for(let aId of achievementsvWin){
				setTimeout(function() {showAchievement(aId,typeAchievements,getId('achievementsLoc2'));}, 2000*countAchievement);
				countAchievement++;
			}
		}
	}
	function retrieveSidebar(){							//Display the Sidebar
		let gameState = getStorage('gameState');
		let player = getCharacter('player');

		let btnRefreshAll = getId('btnRefreshAll');
		if(btnRefreshAll !== undefined && btnRefreshAll !== null)
			btnRefreshAll.remove();

		let dayTimeData = getDayTimeList('all');
		let timeToShow = gameState.time;
		if(gameState.previousTime !== undefined && gameState.previousTime !== null)
			timeToShow = gameState.previousTime;
		let iconCycle = dayTimeData[timeToShow];
		if(iconCycle === undefined)
			iconCycle = 'icon-darkmode';
		getId('logoTimeGame').innerHTML = '<div class="icon '+iconCycle+'"></div>';
		getId('dateGame').innerHTML = ucfirst(getTrad('basic.time.'+timeToShow.toLowerCase()));

		getId('dayCountGame').innerHTML = gameState.dayNumber;
		getId('voteCountGame').innerHTML = player.get('votes');
		let nbFans = ( player.get('fans') !== undefined ?  player.get('fans') : 0);
		getId('fanCountGame').innerHTML = nbFans;

		getId('nameChar').innerHTML = player.getNameDisplay();

		getId('pictFacePlayer').src = player.pict;
		getId('pictTopPlayer').src = player.giveClothImg('topCloth');
		getId('pictBottomPlayer').src = player.giveClothImg('bottomCloth');

		if(typeof forceNoPicture !== 'undefined' && forceNoPicture){
			addClass(getId('pictFacePlayer'),'hide');
			addClass(getId('pictTopPlayer'),'hide');
			addClass(getId('pictBottomPlayer'),'hide');
		}

		let seeBarStat = setting('progressnumber');
		if(seeBarStat){
			removeClass(getId('infoChar'),'hide');
			getId('slutBar').querySelector('.barTextSpan').innerHTML = ucfirst(getTrad('basic.slut'))+': '+player.get('slut').toFixed(0)+'/100';
			getId('slutBar').querySelector('.barBar').style.width = Math.round(player.get('slut')*100/100)+'%';
			getId('bimboBar').querySelector('.barTextSpan').innerHTML = ucfirst(getTrad('basic.bimbo'))+': '+player.get('bimbo').toFixed(0)+'/100';
			getId('bimboBar').querySelector('.barBar').style.width = Math.round(player.get('bimbo')*100/100)+'%';

			//Stages
			for(let stageType of window.database.stageType){
				let stageIcon = 'icon-dot'+player.get(stageType+'Stage');
				let stateStage = player.get(stageType+'Stage');
				if(stateStage >= window.database.maxStageStats)
					stageIcon = 'icon-star';
				let stageElem = getId(stageType+'Stage');
				emptyClass(stageElem);
				addClass(stageElem,'icon');
				addClass(stageElem,stageIcon);
				stageElem.setAttribute('title',getTrad('basic.statestage',{'lvl':stateStage}));
			}


		}else{
			addClass(getId('infoChar'),'hide');
		}

		if(getId('menu-computer') !== null){
			removeClass(getId('menu-computer').querySelector('.btn'),'btn-info');
			getId('menu-computer').removeAttribute('disabled');
			getId('menu-computer').querySelector('.btn').setAttribute('title',getTrad('mainmenu.store'));
			if(player.havePerk('crazyworld')){
				if(player.bimbo <= 0||player.slut <= 0){
					getId('menu-computer').setAttribute('disabled','disabled');
					getId('menu-computer').querySelector('.btn').setAttribute('title',getTrad('ending.btnstore.smart'));
				}else if(player.votes >= parseFloat(getPrice())){		//Show if you can buy something in the store
					addClass(getId('menu-computer').querySelector('.btn'),'btn-info');
				}
			}else{
				if(player.bimbo >= 100){
					getId('menu-computer').setAttribute('disabled','disabled');
					getId('menu-computer').querySelector('.btn').setAttribute('title',getTrad('ending.btnstore.bimbo'));
				}else if(player.slut >= 100){
					getId('menu-computer').setAttribute('disabled','disabled');
					getId('menu-computer').querySelector('.btn').setAttribute('title',getTrad('ending.btnstore.slut'));
				}else if(player.votes >= parseFloat(getPrice())){		//Show if you can buy something in the store
					addClass(getId('menu-computer').querySelector('.btn'),'btn-info');
				}
			}
		}
	}
	function showInformation(){							//Display Additionnal Information (votes gain, Popup...)
		let gameState = getStorage('gameState');

		if(gameState.info !== undefined){
			if(gameState.info.addVotes !== undefined){		//Show the Votes Gain
				popupVotes(gameState.info.addVotes);
			}
			if(gameState.info.addFans !== undefined){		//Show the Votes Gain
				popupVotes(gameState.info.addFans);
			}
		}
	}
	function activateController(){						//Enable the control (button, etc...)

		//Menu SideBar
			getId('menu-profile').onclick = function(){
				characterDetails('player');
			}
			getId('menu-characters').onclick = function(){
				characterList();
			}
			getId('menu-inventory').onclick = function(){
				showInventory();
			}
			getId('menu-mainmenu').onclick = function(){
				let from = getStorage('currentPage');
				showPage(from,'main-menu');
			}
			getId('menu-save').onclick = function(){
				savegamePage();
				let from = getStorage('currentPage');
				showPage(from,'main-savegame');
			}
			getId('menu-options').onclick = function(){
				optionPage();
			}
			getId('menu-help').onclick = function(){
				let from = getStorage('currentPage');
				showPage(from,'main-help');
			}

			//Store
			getId('menu-computer').onclick = function(){
				if(this.getAttribute('disabled') === null){
					showStore();
				}
			}

		let btnList = null;

		//Btn Change Location
			btnList = document.querySelectorAll('.locationBtn:not([disabled])');
			btnList.forEach(function(btn){
				btn.onclick = function(e) {
					let location = this.getAttribute('data-location');
					gameControl({'type':'navigation','id':location});
				};
			});

		//Btn Do Action
			btnList = document.querySelectorAll('.actionBtn:not([disabled])');
			if(btnList.length > 0){
				btnList.forEach(function(btn){
					btn.onclick = function(e) {
						let action = this.getAttribute('data-action');
						let people = this.getAttribute('data-people');
						gameControl({'type':'action','id':action,'people':people});
					};
				});
			}

		//Btn Do Action
			btnList = document.querySelectorAll('.activityBtn:not([disabled])');
			if(btnList.length > 0){
				btnList.forEach(function(btn){
					btn.onclick = function(e) {
						let action = this.getAttribute('data-activity');
						gameControl({'type':'activity','id':action});
					};
				});
			}

		//Btn Action Mod Object
			btnList = document.querySelectorAll('.actionDoContinue');
			if(btnList.length > 0){
				btnList.forEach(function(btn){
					btn.onclick = function(e){
						let trapId = this.getAttribute('data-trapId');
						gameControl({'type':'actionDoContinue','trapId':trapId});
					};
				});
			}

		//Btn nextDayBtn
			btnList = document.querySelectorAll('.nextDayBtn');
			btnList.forEach(function(btn){
				btn.onclick = function(e) {
					gameControl({'type':'nextDay'});
				};
			});

		//BtnChange
			btnList = document.querySelectorAll('.btnChange');
			btnList.forEach(function(btn){
				btn.onclick = function(e) {
					let origin = this.getAttribute('data-origin');
					let target = this.getAttribute('data-target');
					addClass(getId(origin),'hide');
					removeClass(getId(target),'hide');
					window.scrollTo(0, 0);
					getId('gameContent').querySelector('article').scrollTo(0, 0);

					//For DailyRecap to trigger the votes popup at the right time
					let gameState = getStorage('gameState');
					if(target == 'dailyFun' && gameState.info.addVotesMastu !== undefined){
						popupVotes(gameState.info.addVotesMastu);
					}else if(target == 'dailyRecap'){
						if(gameState.info.addVotesCorruption !== undefined)
							popupVotes(gameState.info.addVotesCorruption);
						if(gameState.info.fansVotes !== undefined)
							popupVotes({'nbVote':gameState.info.fansVotes});
					}

					if(getId(target).closest('#dailyPage') !== null && getId(target).innerHTML.indexOf('btnChange') === -1){
						removeClass(getId('dailyDreamBtn'),'hide');
					}
				};
			});

		//BtnCounter Events Ambush
			btnList = document.querySelectorAll('.btnCounter');
			btnList.forEach(function(btn){
				btn.onclick = function(e) {
					let use = this.getAttribute('data-use');
					let gameState = getStorage('gameState');
					eventHandler(gameState,{'eventCounter':use});
				};
			});

		//BtnCounter Events Other
			btnList = document.querySelectorAll('.btnEventContinue');
			btnList.forEach(function(btn){
				btn.onclick = function(e) {
					let use = this.getAttribute('data-use');
					let gameState = getStorage('gameState');
					eventHandler(gameState,{'blockSelected':use});
				};
			});

		//BtnCamera Camera room actions
			btnList = document.querySelectorAll('.btnCamera');
			btnList.forEach(function(btn){
				btn.onclick = function(e) {
					let choose = this.getAttribute('data-use');
					gameControl({'type':'action','id':'cameraroom','choose':choose});
				};
			});

		//lootableBtn
			btnList = document.querySelectorAll('.lootableBtn');
			btnList.forEach(function(btn){
				btn.onclick = function(e) {
					let id = this.getAttribute('data-id');
					gameControl({'type':'lootable','id':id});
				};
			});
	}
	function renderStuff(){								//Manage Animations and others

		//Wavy & Flip Effects
			for(let elem of ['wavy','flip']){
				let list = document.getElementsByTagName(elem);
				for(let elemId in list){
					let text = list[elemId].innerHTML;

					if(text !== undefined && text.indexOf('<span style="--i') !== 0){
						let newText = [];
						for(let i in text){
							let letter = text[i];
							if(letter == ' ')
								newText.push('&nbsp;&nbsp;');
							else
								newText.push('<span style="--i:'+i+'">'+letter+'</span>');
						}
						list[elemId].innerHTML = newText.join('');
					}
				}
			}

		//Video Speed
			let speedvideo = setting('speedvideo');
			if(speedvideo !== undefined && speedvideo !== "1"){
				let videos = document.querySelectorAll('video');
				speedvideo = parseFloat(speedvideo);
				for(let video of videos){
					video.defaultPlaybackRate = speedvideo;
					if(video.src !== ""){
						video.load();
					}
				}
			}

		//Enable Sub Games
			let gameNode = getId('gameContener');
			if(gameNode !== null){
				let gameConfig = gameNode.getAttribute('data-config');
				gameConfig = JSON.parse(gameConfig.replaceAll("'",'"'));

				if(gameConfig.css !== undefined){
					for(let cssRuleId in gameConfig.css){
						gameNode.style[cssRuleId] = gameConfig.css[cssRuleId];
					}
				}

				let gameParams = gameConfig.params;
				if(gameConfig.config !== undefined){
					let diffConfig = gameConfig.config[getStorage('difficulty')];
					for(let elemId in diffConfig){
						gameParams[elemId] = diffConfig[elemId];
					}
				}
				switch(gameConfig.type){
					case 'game1':new game1(gameParams);break;
					case 'game2':new game2(gameParams);break;
				}
			}
	}
	function manageVersion(){							//Do some operation if not the current version of the game
		let gameState = getStorage('gameState');
		if(gameState === false){						//Init if needed (old Version)
			clearPage();
			let player = getCharacter('player');
			gameState = {
				'actionType':null,
				'location':getStorage('currentLocation'),
				'dayNumber':getStorage('dayNumber'),
				'time':getStorage('timeDay'),
				'cameraUsed':player.get('cameraUsed'),
				'info':{}
			};
			setStorage('gameState',gameState);
		}
		let villa = getStorage('villa');

		if(villa.version === undefined || villa.version != window.database.version){
			if(villa.version <= '1.4.02'){		//New Handle of Secondary Character
				defineCharacterSecondary();
				let charSec = getStorage('characterSec');

				//Get the old set
				let keepList = {
					'scientist':'scientistSet',
					'accountant':'accountantSet',
					'fleshgoddess':'fleshgoddessSet',
					'naturegoddess':'naturegoddessSet',
				}
				for(let id in keepList){
					let val = keepList[id];
					charSec[id].set = villa[val];
					delete villa[val];
				}
				villa.version = window.database.version;
				setStorage('villa',villa);

				//Seen or not
				let player = getCharacter('player');
				if(player.stats.eventOtherEncountered.accountant !== undefined && player.stats.eventOtherEncountered.accountant >= 1)
					charSec.accountant.info.seen = true;
				if(player.stats.eventOtherEncountered.thevoucher !== undefined && player.stats.eventOtherEncountered.thevoucher >= 1)
					charSec.accountant.info.seen = true;
				if(player.stats.eventOtherEncountered.scientist !== undefined && player.stats.eventOtherEncountered.scientist >= 1)
					charSec.scientist.info.seen = true;
				if(player.stats.eventOtherEncountered.scientistfail !== undefined && player.stats.eventOtherEncountered.scientistfail >= 1)
					charSec.scientist.info.seen = true;
				if(player.stats.eventOtherEncountered.dickylarson !== undefined && player.stats.eventOtherEncountered.dickylarson >= 1)
					charSec.dickylarson.info.seen = true;
				if(player.stats.eventOtherEncountered.fanboy !== undefined && player.stats.eventOtherEncountered.fanboy >= 1)
					charSec.fanboy.info.seen = true;

				if(player.stats.dreams.fleshrealm !== undefined)
					charSec.fleshgoddess.info.seen = true;
				if(player.stats.dreams.naturerealm !== undefined)
					charSec.naturegoddess.info.seen = true;

				setStorage('characterSec',charSec);
			}
		}
	}

	//Todo to delete after few days
	function clearPage(){
		let elemsToPurge = [
			'contentDisplay',
			'eventDisplay',
			'actionDisplay',
			'logsDisplay',
			'actionChoosed',
			'activityChoosed',
			'navigationChoosed',
			'eventChoosed',
			'infoNextDay',
			'timeDayPrevious',
			'randomhousemate',
		];
		for(let elem of elemsToPurge)
			deleteStorage(elem);

		getId('storyPage').innerHTML = '';
	}

/***************************/
/********* CONTROLS ********/
/***************************/
	var isMousedown = false;
	function moveBarValue(ev){
		changeBarValue(ev);
	}
	function changeBarValue(ev){
		if (isMousedown) {
			let elem = ev.target.closest('.bar-border');
			let elemVals = elem.getBoundingClientRect();
			let x = ev.clientX - elemVals.left;
			let xPourcent = Math.round(x * 100 / elem.offsetWidth);

			elem.getElementsByClassName('bar-content')[0].style.width = xPourcent+'%';
			elem.getElementsByClassName('bar-content')[0].innerHTML = xPourcent+'%';
		}
	}