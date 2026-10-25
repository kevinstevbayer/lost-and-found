/* All balance and player-facing content is centralized here. */
const DATA={
  currency:'CURRENCY_01',
  metaCurrency:'CURRENCY_02',
  dayLength:90,
  maxEntities:36,
  clutterStart:12,
  LAYOUT:{
    COUNTER_TOP:{x:64,y:106,w:213,h:24,x2:277,y2:130},
    COUNTER_FRONT:{x:64,y:132,w:213,h:28,x2:277,y2:160},
    CUSTOMER_QUEUE:{x:90,y:56,w:150,h:46,x2:240,y2:102},
    SHELF_WALL:{x:88,y:14,w:113,h:64,x2:201,y2:78,cols:7,rows:4},
    FLOOR_PILE:{x:76,y:54,w:79,h:36,x2:155,y2:90},
    STORE_DOOR:{x:203,y:8,w:46,h:60,x2:249,y2:68},
    FRONT_DOOR:{x:51,y:12,w:29,h:56,x2:80,y2:68},
    HELPER_BENCH:{x:247,y:48,w:60,h:52,x2:307,y2:100},
    FOREGROUND_BOXES:[
      {x:38,y:142,w:69,h:38,x2:107,y2:180},
      {x:237,y:156,w:83,h:24,x2:320,y2:180}
    ]
  },
  balance:{
    baseHelperCost:35,helperCostGrowth:1.65,upgradeCostGrowth:1.72,arrivalSeconds:2.1,
    clutterArrivalDivisor:55,ambiguityBase:.25,ambiguityCeiling:.3,ambiguityClutterDivisor:300,
    clutterPenaltyStart:.35,clutterGrowthBase:.15,clutterGrowthModifier:.12,
    correctHandoverClutter:2.5,wrongHandoverClutter:3,helperIdleSeconds:5,autoPokeSeconds:3,
    prestigeScoreDivisor:10000,prestigeScoreRoot:2,prestigeFloor:1,endlessTargetGrowth:1.14,
    perfectDayPayoutRate:.35,minimumPerfectPayout:40,overflowPayoutRate:.55,
    comboCap:40,comboBaseRate:.018,overFlowHoardPayout:.3,nightBonusPerMinute:2,nightBonusCap:150
  },
  tags:['TAG_01','TAG_02','TAG_03','TAG_04','TAG_05','TAG_06'],
  gambles:[
    {id:'GAMBLE_01',kind:'scratch',tag:null,minClutter:0,baseOdds:.62,mult:1.85},
    {id:'GAMBLE_02',kind:'raffle',tag:null,minClutter:10,baseOdds:.50,mult:2.20},
    {id:'GAMBLE_03',kind:'carousel',tag:null,minClutter:0,baseOdds:.56,mult:2.10},
    {id:'GAMBLE_04',kind:'bluff',tag:null,minClutter:0,baseOdds:.52,mult:2.35},
    {id:'GAMBLE_05',kind:'cursed_seal',tag:'TAG_04',minClutter:15,baseOdds:.46,mult:2.65},
    {id:'GAMBLE_06',kind:'wriggle_shakes',tag:'TAG_05',minClutter:20,baseOdds:.48,mult:2.50},
    {id:'GAMBLE_07',kind:'avalanche_dive',tag:'TAG_06',minClutter:50,baseOdds:.42,mult:3.00}
  ],
  restorationSteps:[
    {id:'RESTORE_01',step:1,cost:60,timeCost:2,baseFail:.14,weirdChance:.08,valueMult:1.20},
    {id:'RESTORE_02',step:2,cost:140,timeCost:3,baseFail:.20,weirdChance:.12,valueMult:1.32},
    {id:'RESTORE_03',step:3,cost:320,timeCost:4,baseFail:.26,weirdChance:.16,valueMult:1.45},
    {id:'RESTORE_04',step:4,cost:700,timeCost:5,baseFail:.32,weirdChance:.22,valueMult:1.60}
  ],
  restoreOutcomes:[
    {id:'RESTORE_FAIL_01',kind:'ruined',valueMult:.55,clutterDelta:8,tagShift:null},
    {id:'RESTORE_FAIL_02',kind:'weird_cursed',valueMult:1.95,clutterDelta:5,tagShift:'TAG_04'},
    {id:'RESTORE_FAIL_03',kind:'weird_alive',valueMult:2.25,clutterDelta:6,tagShift:'TAG_05'}
  ],
  quickBuyIds:['UPGRADE_CLICK_1','UPGRADE_ORDER_1','UPGRADE_SORT_1','UPGRADE_LUCK_1'],
  items:[
    {id:'ITEM_01',tag:'TAG_01',value:8,color:6},{id:'ITEM_02',tag:'TAG_02',value:10,color:8},
    {id:'ITEM_03',tag:'TAG_03',value:12,color:5},{id:'ITEM_04',tag:'TAG_04',value:16,color:9},
    {id:'ITEM_05',tag:'TAG_05',value:22,color:7},{id:'ITEM_06',tag:'TAG_06',value:30,color:10},
    {id:'ITEM_07',tag:'TAG_01',value:40,color:11},{id:'ITEM_08',tag:'TAG_02',value:60,color:4},
    {id:'ITEM_09',tag:'TAG_03',value:90,color:12},{id:'ITEM_10',tag:'TAG_04',value:140,color:14},
    {id:'ITEM_11',tag:'TAG_05',value:220,color:15},{id:'ITEM_12',tag:'TAG_06',value:400,color:13}
  ],
  helpers:[
    {id:'HELPER_01',speed:2.8,accuracy:.65,tag:'TAG_01',wage:5},
    {id:'HELPER_02',speed:2.1,accuracy:.76,tag:'TAG_02',wage:9},
    {id:'HELPER_03',speed:3.2,accuracy:.55,tag:'TAG_03',wage:10},
    {id:'HELPER_04',speed:1.7,accuracy:.9,tag:'TAG_04',wage:16},
    {id:'HELPER_05',speed:1.25,accuracy:.96,tag:'TAG_05',wage:28},
    {id:'HELPER_06',speed:.9,accuracy:.99,tag:'TAG_06',wage:45}
  ],
  customers:Array.from({length:16},(_,i)=>({id:'CUSTOMER_'+String(i+1).padStart(2,'0'),unlock:i<4?1:Math.floor(i/2)+2,patience:8+Math.min(i,8),reward:1+i*.14})),
  upgrades:[
    ['UPGRADE_CLICK_1','click',1,20],['UPGRADE_CLICK_2','click',3,180],
    ['UPGRADE_ORDER_1','order',.08,40],['UPGRADE_ORDER_2','order',.18,260],
    ['UPGRADE_HELPER_1','helper',.2,65],['UPGRADE_HELPER_2','helper',.45,420],
    ['UPGRADE_AUTOPOKE_1','autopoke',1,1200],['UPGRADE_SHIFT_1','shift',15,300],
    ['UPGRADE_SORT_1','sort',.12,90],['UPGRADE_SORT_2','sort',.25,650],
    ['UPGRADE_DISPOSAL_1','disposal',1,180],['UPGRADE_AUCTION_1','auction',.2,250],
    ['UPGRADE_LUCK_1','luck',.06,100],['UPGRADE_LUCK_2','luck',.14,850],
    ['UPGRADE_INSURANCE_1','insurance',.2,300],['UPGRADE_REROLL_1','reroll',1,500],
    ['UPGRADE_GAMBLE_1','gamble',1,750],['UPGRADE_HOARD_1','hoard',.15,600],
    ['UPGRADE_NIGHT_1','night',1,1000],['UPGRADE_MERGE_1','merge',1,900],
    ['UPGRADE_FAST_1','fast',1,1500],['UPGRADE_CLUTTER_1','clutter',.2,180],
    ['UPGRADE_COMBO_1','combo',.25,220],['UPGRADE_BOSS_1','boss',.15,1000]
  ].map(([id,effect,amount,cost])=>({id,effect,amount,cost})),
  modifiers:[
    {id:'MODIFIER_01',label:'Double arrivals',arrival:1.5},
    {id:'MODIFIER_02',label:'Sleepy helpers',tired:1.6},
    {id:'MODIFIER_03',label:'Clutter surge',clutter:1.5},
    {id:'MODIFIER_04',label:'Lucky shift',luck:.12},
    {id:'MODIFIER_05',label:'Long shift',duration:1.15},
    {id:'MODIFIER_06',label:'Rival traffic',rival:1},
    {id:'MODIFIER_07',label:'Fragile parcels',accuracy:-.1},
    {id:'MODIFIER_08',label:'Clean room',clutter:.7}
  ],
  bosses:Array.from({length:8},(_,i)=>({id:'DAY_BOSS_'+String(i+1).padStart(2,'0'),rule:['TAG_01','TAG_02','TAG_03','TAG_04','TAG_05','TAG_06','GAMBLE','COMBO'][i],reward:150*(i+1)})),
  events:['EVENT_01','EVENT_02','EVENT_03','EVENT_04','EVENT_05','EVENT_06'].map((id,i)=>({id,label:['Customer stampede','Helper strike','Escaped item','Power cut','Inspection','Rival raid'][i]})),
  skills:['CLICK','HELPER','ODDS'].flatMap((b,bi)=>Array.from({length:6},(_,i)=>({id:`SKILL_${b}_${i+1}`,branch:b,requires:i?`SKILL_${b}_${i}`:null,cost:i<2?1:2,effect:['click','helper','luck'][bi],amount:(i+1)*.08,tradeoff:i===4}))),
  endings:['ENDING_01','ENDING_02','ENDING_03','ENDING_04','ENDING_05'],
  achievements:Array.from({length:60},(_,i)=>({id:'ACH_'+String(i+1).padStart(2,'0'),condition:i})),
  daySchedule:Array.from({length:30},(_,i)=>({day:i+1,length:90+Math.floor(i/5)*4,target:120*Math.pow(1.42,i),difficulty:1+i*.07,boss:(i+1)%4===0,events:i%3===2?['EVENT_01']:[]})),
  clutterTiers:[{id:'CLUTTER_01',at:0},{id:'CLUTTER_02',at:25},{id:'CLUTTER_03',at:50},{id:'CLUTTER_04',at:75},{id:'CLUTTER_05',at:90}],
  title:'GAME_TITLE',
  location:'LOCATION_01',
  names:{
    GAME_TITLE:'Lost & Found & Found',LOCATION_01:'The Back Desk',
    CURRENCY_01:'Desk Bucks',CURRENCY_02:'After-Hours Tokens',
    PRESS_START_TICKET:'PRESS START',NOW_SERVING_LABEL:'NOW SERVING',
    CLUTTER_01:'Neatly Misplaced',CLUTTER_02:'Box Fort',CLUTTER_03:'Junk Nebula',CLUTTER_04:'Structural Pile',CLUTTER_05:'One More Thing',
    TAG_01:'Fragile',TAG_02:'Shiny',TAG_03:'Sentimental',TAG_04:'Cursed',TAG_05:'Alive-ish',TAG_06:'Mysterious',
    GAMBLE_01:'GAMBLE_01',GAMBLE_02:'GAMBLE_02',GAMBLE_03:'GAMBLE_03',GAMBLE_04:'GAMBLE_04',GAMBLE_05:'GAMBLE_05',GAMBLE_06:'GAMBLE_06',GAMBLE_07:'GAMBLE_07',
    RESTORE_01:'RESTORE_01',RESTORE_02:'RESTORE_02',RESTORE_03:'RESTORE_03',RESTORE_04:'RESTORE_04',
    RESTORE_FAIL_01:'RESTORE_FAIL_01',RESTORE_FAIL_02:'RESTORE_FAIL_02',RESTORE_FAIL_03:'RESTORE_FAIL_03',
    PERK_ARC_01:'PERK_ARC_01',PERK_ARC_02:'PERK_ARC_02',PERK_ARC_03:'PERK_ARC_03',PERK_ARC_04:'PERK_ARC_04',
    PERK_ARC_05:'PERK_ARC_05',PERK_ARC_06:'PERK_ARC_06',PERK_ARC_07:'PERK_ARC_07',PERK_ARC_08:'PERK_ARC_08',
    SCENE_A:'SCENE_A',SCENE_B:'SCENE_B',SCENE_C:'SCENE_C',SCENE_D:'SCENE_D',SCENE_E:'SCENE_E',SCENE_F:'SCENE_F',SCENE_G:'SCENE_G',
    BG_OFFICE_01:'BG_OFFICE_01',BG_WIDE_VAR_01:'BG_WIDE_VAR_01',NPC_CAT_01:'NPC_CAT_01',
    CUSTOMER_01:'The Forgetful Regular',CUSTOMER_02:'Countess of Pockets',CUSTOMER_03:'The Tiny Detective',CUSTOMER_04:'Uncle Maybe',
    CUSTOMER_05:'The Astral Tourist',CUSTOMER_06:'Captain Damp',CUSTOMER_07:'The Coupon Oracle',CUSTOMER_08:'Madame Pigeon',
    CUSTOMER_09:'The Sleepwalker',CUSTOMER_10:'Dr. Probably',CUSTOMER_11:'The Tiny Giant',CUSTOMER_12:'Mister Tuesday',
    CUSTOMER_13:'The Apology Machine',CUSTOMER_14:'Auntie Static',CUSTOMER_15:'The Baron of Lost Socks',CUSTOMER_16:'The Last Customer',
    ITEM_01:'Cracked Teacup',ITEM_02:'Pocket Mirror',ITEM_03:'Birthday Button',ITEM_04:'Unlucky Key',
    ITEM_05:'Murmuring Plant',ITEM_06:'Unmarked Parcel',ITEM_07:'Glass Egg',ITEM_08:'The Star-Cut Diamond',
    ITEM_09:'The Sunken Emperor’s Seal',ITEM_10:'The Blackfire Crown',ITEM_11:'The Gilded Scarab',ITEM_12:'The Dragon’s Treasury Egg',
    HELPER_01:'Zip',HELPER_02:'Shine',HELPER_03:'Skip',HELPER_04:'Moss',HELPER_05:'Nib',HELPER_06:'Professor Dot',
    UPGRADE_CLICK_1:'Finger of Destiny',UPGRADE_CLICK_2:'Industrial-Grade Finger',UPGRADE_ORDER_1:'Better Labels',UPGRADE_ORDER_2:'Suspiciously Accurate Labels',
    UPGRADE_HELPER_1:'Tiny Whistles',UPGRADE_HELPER_2:'Whistles With More Tiny',UPGRADE_AUTOPOKE_1:'Self-Poking Stick',UPGRADE_SHIFT_1:'Longer Lunch Break',
    UPGRADE_SORT_1:'Boxes Within Boxes',UPGRADE_SORT_2:'Boxes With A System',UPGRADE_DISPOSAL_1:'The Clutter Chute',UPGRADE_AUCTION_1:'Auctioneer’s Megaphone',
    UPGRADE_LUCK_1:'Lucky Stapler',UPGRADE_LUCK_2:'Lucky Stapler: Deluxe',UPGRADE_INSURANCE_1:'Oops Insurance',UPGRADE_REROLL_1:'Ask Again Nicely',
    UPGRADE_GAMBLE_1:'Double Or Regret',UPGRADE_HOARD_1:'Pile Appreciation',UPGRADE_NIGHT_1:'Night-Shift Gremlin',UPGRADE_MERGE_1:'The Item Blender',
    UPGRADE_FAST_1:'Temporal Coffee',UPGRADE_CLUTTER_1:'Premium Dust',UPGRADE_COMBO_1:'Combo Stamp',UPGRADE_BOSS_1:'Boss-Proof Clipboard',
    MODIFIER_01:'Everybody Arrives At Once',MODIFIER_02:'Sleepy Shift',MODIFIER_03:'The Pile Is Growing',MODIFIER_04:'Lucky Socks',
    MODIFIER_05:'The Clock Is Feeling Generous',MODIFIER_06:'Rival Desk Nearby',MODIFIER_07:'Handle With Guesswork',MODIFIER_08:'Unexpectedly Tidy',
    EVENT_01:'Queue! Queue! Queue!',EVENT_02:'The Whistle Walkout',EVENT_03:'That Item Has Legs',EVENT_04:'Lights Out, Receipts Up',
    EVENT_05:'Clipboard Inspection',EVENT_06:'The Other Desk',RIVAL_01:'The Other Desk',
    DAY_BOSS_01:'The Glass Inspector',DAY_BOSS_02:'The Glitter Auditor',DAY_BOSS_03:'The Sentiment Collector',DAY_BOSS_04:'The Hex Accountant',
    DAY_BOSS_05:'The Worm Wrangler',DAY_BOSS_06:'The Mystery Customer',DAY_BOSS_07:'The Double-or-Nothing Duke',DAY_BOSS_08:'The Combo Reverser',
    ENDING_01:'The Click Heard ’Round the Desk',ENDING_02:'A Thousand Tiny Employees',ENDING_03:'The Pile Wins Again',ENDING_04:'The House Is Confused',ENDING_05:'Closed For Mysterious Reasons'
  },
  assets:Object.create(null)
};

const assetGroups={
  customers:DATA.customers.map(v=>v.id),items:DATA.items.map(v=>v.id),helpers:DATA.helpers.map(v=>v.id),
  upgrades:DATA.upgrades.map(v=>v.id),skills:DATA.skills.map(v=>v.id),events:DATA.events.map(v=>v.id),
  bosses:DATA.bosses.map(v=>v.id),endings:DATA.endings,clutter:DATA.clutterTiers.map(v=>v.id),
  modifiers:DATA.modifiers.map(v=>v.id),currencies:[DATA.currency,DATA.metaCurrency],rivals:['RIVAL_01'],
  achievements:DATA.achievements.map(v=>v.id),tags:DATA.tags,choices:['CHOICE_HELP','CHOICE_EXPLOIT','CHOICE_HIDE','CHOICE_KEEP']
};
for(const [group,ids] of Object.entries(assetGroups))for(const id of ids){
  const animated=group==='helpers',portrait=group==='customers',states=['idle','working','sleeping','happy','angry','leaving'];
  const folder=group==='rivals'?'rival':group,frameSize=group==='items'?24:portrait?160:32;
  DATA.assets[id]={
    path:`assets/${folder}/${id}.png`,frameWidth:frameSize,frameHeight:frameSize,
    frameCount:animated?36:1,frameColumns:animated?6:1,frameRows:animated?6:1,fps:animated?8:0,
    anchor:{x:.5,y:1},scale:1,
    animations:animated?Object.fromEntries(states.map((state,i)=>[state,{startFrame:i*6,frameCount:6,fps:8}])):{idle:{startFrame:0,frameCount:1,fps:0}}
  };
}
for(const g of DATA.gambles){
  DATA.assets[g.id]={path:`assets/anim/${g.id}.png`,frameWidth:120,frameHeight:80,frameCount:6,frameColumns:6,frameRows:1,fps:12,anchor:{x:.5,y:.5},scale:1,animations:{idle:{startFrame:0,frameCount:6,fps:12}}};
}
for(const sid of ['SCENE_A','SCENE_B','SCENE_C','SCENE_D','SCENE_E','SCENE_F','SCENE_G']){
  DATA.assets[sid]={path:`assets/anim/${sid}.png`,frameWidth:120,frameHeight:80,frameCount:6,frameColumns:6,frameRows:1,fps:6,anchor:{x:.5,y:.5},scale:1,animations:{idle:{startFrame:0,frameCount:6,fps:6}}};
}
DATA.assets.BG_WIDE_VAR_01={path:'assets/anim/BG_WIDE_VAR_01.png',frameWidth:240,frameHeight:80,frameCount:3,frameColumns:3,frameRows:1,fps:4,anchor:{x:0,y:0},scale:1,animations:{idle:{startFrame:0,frameCount:3,fps:4}}};
DATA.assets.BG_OFFICE_01={path:'assets/anim/BG_OFFICE_01.png',frameWidth:320,frameHeight:180,frameCount:6,frameColumns:6,frameRows:1,fps:5,anchor:{x:0,y:0},scale:1,animations:{idle:{startFrame:0,frameCount:6,fps:5}}};
DATA.assets.BACKGROUND_OFFICE={path:'assets/ui/BACKGROUND_OFFICE.png',frameWidth:320,frameHeight:180,frameCount:1,fps:0,anchor:{x:.5,y:.5},scale:1,animations:{idle:{frameCount:1,fps:0}}};
DATA.assets.GAME_TITLE={path:'assets/ui/GAME_TITLE.png',frameWidth:160,frameHeight:48,frameCount:1,fps:0,anchor:{x:.5,y:.5},scale:1,animations:{idle:{frameCount:1,fps:0}}};
DATA.assets.LOCATION_01={path:'assets/ui/LOCATION_01.png',frameWidth:160,frameHeight:32,frameCount:1,fps:0,anchor:{x:.5,y:.5},scale:1,animations:{idle:{frameCount:1,fps:0}}};

Object.assign(DATA.names,Object.fromEntries(['Quick Tap','Double Tap','Rapid Filing','Desk Drumming','Reckless Reach','Ten-Finger Legend'].map((n,i)=>[`SKILL_CLICK_${i+1}`,n])));
Object.assign(DATA.names,Object.fromEntries(['First Whistle','Extra Hands','Shift Rotation','Motivational Snacks','Unpaid Overtime','Helper Hive'].map((n,i)=>[`SKILL_HELPER_${i+1}`,n])));
Object.assign(DATA.names,Object.fromEntries(['Lucky Guess','SKILL_ODDS_2','Second Opinion','House Advantage','Chaos Dividend','Reality’s Fine Print'].map((n,i)=>[`SKILL_ODDS_${i+1}`,n])));
Object.assign(DATA.names,Object.fromEntries(['First In, First Out','A Hundred Little Handoffs','The Queue Knows Your Name','Nobody Left Behind','Confidently Incorrect','A Very Full Back Room','Poke Enthusiast','One More Box','A Model Shift','Employee Of The Century','Help Has Arrived','A Tiny Army','A Pocketful Of Desk Bucks','A Briefcase Of Desk Bucks','A Warehouse Of Desk Bucks','Five Days On The Job','Double Digits','The Month Is Misplaced','Combo Apprentice','Combo Menace','Let’s Make This Worse','Still Confidently Incorrect','There’s A Box In The Box','You Can See The Floor','A New Branch','The Whole Skill Tree','Collector’s Shelf','Collector’s Room','Taking A Little Break','Wake Up, Zip','Important Customer','A Hundred Shifts Later','A Token Of Appreciation','Going Once, Going Twice','Science Was Attempted','Poke-Free Workplace','Boss, Handled','A Trillion Tiny Receipts','Five Thousand Handoffs','The Queue Has Feelings','Fifty Days Of This','Back To The Beginning','The Whole Break Room','A Carefully Balanced Pile','Perfectly Imperfect, Thirty Times','Combo Urban Legend','A Quadrillion Tiny Receipts','Certified In Everything','Nothing Left To Find','Incorrect With Confidence','Ten Times The Floor Disappeared','Poking Is A Management Style','Time Is A Suggestion','Day-One Millionaire','Boss, No Notes','A Surprisingly Clean Desk','Zip’s Entire Extended Family','Professor Dot Has Arrived','One Hundred Days At The Desk','Token Tycoon'].map((n,i)=>[`ACH_${String(i+1).padStart(2,'0')}`,n])));

const BASE_ARCS=[
  {id:'CUSTOMER_01',perkId:'PERK_ARC_01',perkEffect:{effect:'order',amount:.12},beats:[1,7,13,19,25],lines:['I seem to have lost the thing I was just holding.','I lost the list that tells me what I lose.','I remember you. I think.','This is the fourth time I have misplaced ITEM_01.','I am leaving with everything I came in holding. Probably.']},
  {id:'CUSTOMER_02',perkId:'PERK_ARC_02',perkEffect:{effect:'click',amount:.45},beats:[2,8,14,20,26],lines:['A pocket emergency! I require ITEM_02.','My other pocket has gone missing as well.','The court has ruled that the mirror is mine.','I shall reward your service with a dramatic bow.','You are hereby appointed Royal Keeper of Pockets.']},
  {id:'CUSTOMER_03',perkId:'PERK_ARC_03',perkEffect:{effect:'sort',amount:.14},beats:[3,9,15,21,27],lines:['I have deduced that ITEM_03 is nearby.','The clue is button-shaped. Case nearly closed.','A suspect has been seen near the back room.','The button was on my coat the whole time.','A detective never retires. A detective takes a snack break.']},
  {id:'CUSTOMER_04',perkId:'PERK_ARC_04',perkEffect:{effect:'luck',amount:.10},beats:[4,10,16,22,28],lines:['I may have lost ITEM_04. Or a sandwich.','It was definitely a key. Unless it was a spoon.','The key opens something. This is my strongest clue.','I found the sandwich. The key remains a mystery.','Keep the key safe. I am going to forget where you are.']},
  {id:'CUSTOMER_05',perkId:'PERK_ARC_05',perkEffect:{effect:'shift',amount:12},beats:[5,11,17,23,29],lines:['I dropped ITEM_05 in another dimension.','The dimension has a very reasonable return policy.','I have brought a map. It is mostly a drawing of a hat.','The portal is just the supply closet. Fascinating.','I will visit again after my next orbit around the desk.']},
  {id:'CUSTOMER_06',perkId:'PERK_ARC_06',perkEffect:{effect:'helper',amount:.22},beats:[6,12,18,24,30],lines:['ITEM_06 went overboard! Indoors!','The tide is rising. It is a mop bucket.','My crew insists this is not a boat. Mutiny.','We have found the item and a very small fish.','The ship sails at once. It is a rolling chair.']},
  {id:'CUSTOMER_07',perkId:'PERK_ARC_07',perkEffect:{effect:'auction',amount:.18},beats:[4,10,16,22,28],lines:['I have a coupon for one missing item.','The fine print says the coupon is also missing.','I can offer you two coupons and a mystery sticker.','This coupon expires yesterday. That seems fair.','You have earned a discount on your next mystery.']},
  {id:'CUSTOMER_08',perkId:'PERK_ARC_08',perkEffect:{effect:'combo',amount:.20},beats:[5,11,17,23,29],lines:['A pigeon told me ITEM_08 was here.','The pigeon is a very reliable source.','It has requested a tiny office and one crumb.','I have promoted the pigeon to assistant manager.','We shall return with more crumbs and fewer questions.']}
];
DATA.arcs=BASE_ARCS.map(a=>({
  ...a,
  historyLines:{
    1:{HELP:`You actually helped me last visit! (${a.id})`,EXPLOIT:`You charged me a suspicious fee last time!`,HIDE:`You ducked behind the counter last time!`,KEEP:`That looks a lot like my old parcel on your shelf.`},
    2:{HELP:`Your filing system saved my week.`,EXPLOIT:`My wallet still remembers your handling surcharge.`,HIDE:`Are you hiding behind the claim tickets again?`,KEEP:`You have a whole museum of my belongings now.`},
    4:{HELP:`Five visits and you never let me down!`,EXPLOIT:`Five visits and five service surcharges!`,HIDE:`I finally caught you above the counter!`,KEEP:`At this point, my things live here permanently.`}
  },
  outcomes:a.beats.map((_,bi)=>({
    HELP:{reply:`${a.id} beat ${bi+1}: Handed over with care and a clean stub.`,cash:30+bi*20,clutter:-5-bi,trust:2,perk:bi===4},
    EXPLOIT:{reply:`${a.id} beat ${bi+1}: Paid the expedited lookup surcharge.`,cash:65+bi*35,clutter:7+bi,trust:-2,penalty:bi===4},
    HIDE:{reply:`${a.id} beat ${bi+1}: Left a note on the unattended blotter.`,cash:20+bi*10,clutter:-2,trust:-1},
    KEEP:{reply:`${a.id} beat ${bi+1}: Quietly archived in the back-room hoard.`,cash:85+bi*40,clutter:11+bi,trust:-3,penalty:bi===4}
  }))
}));

DATA.endingCards={
  ENDING_01:['The desk remembers every tap.','The clicking never stops.'],
  ENDING_02:['The helpers have the keys now.','They are surprisingly good at paperwork.'],
  ENDING_03:['The back room becomes a landmark.','Nobody remembers where the door was.'],
  ENDING_04:['The odds blink first.','The desk refuses to explain how.'],
  ENDING_05:['The lights go out at closing time.','Something is still sorting in the dark.']
};
DATA.metaUpgrades=[
  {id:'META_CASH_1',cost:5,effect:'startCash',amount:100},
  {id:'META_SORT_1',cost:8,effect:'sort',amount:.1},
  {id:'META_LUCK_1',cost:12,effect:'luck',amount:.08},
  {id:'META_HELPER_1',cost:18,effect:'helper',amount:.1},
  {id:'META_SHIFT_1',cost:25,effect:'shift',amount:10}
];
Object.assign(DATA.names,{
  META_CASH_1:'Pocketful of Desk Bucks',META_SORT_1:'Pre-Sorted Pile',
  META_LUCK_1:'Fortunate Filing',META_HELPER_1:'Helper Orientation',META_SHIFT_1:'Earlier Opening Time',
  CHOICE_HELP:'HELP',CHOICE_EXPLOIT:'EXPLOIT',CHOICE_HIDE:'HIDE',CHOICE_KEEP:'KEEP'
});
for(const u of DATA.metaUpgrades)DATA.assets[u.id]={path:`assets/meta/${u.id}.png`,frameWidth:32,frameHeight:32,frameCount:1,fps:0,anchor:{x:.5,y:1},scale:1,animations:{idle:{startFrame:0,frameCount:1,fps:0}}};

DATA.introStory=[
  {id:'SCENE_A',altId:'SCENE_B',title:'THE NIGHT SHIFT',speaker:'THE BACK DESK',actor:'HELPER_06',lines:['AT 3:14 AM, THE LOST ROOM','WAS SUPPOSED TO BE EMPTY.','THEN A PARCEL ON THE COUNTER','GAVE A VERY SMALL KNOCK.'],item:'ITEM_06'},
  {id:'SCENE_C',altId:'SCENE_D',title:'A BUSY LITTLE MYSTERY',speaker:'ZIP',actor:'HELPER_01',lines:['BY OPENING TIME, THE QUEUE','WAS OUT THE DOOR.','EVERYONE HAD LOST A THING.','SOME LOST THE STORY TOO.'],item:'ITEM_08'},
  {id:'SCENE_E',altId:'SCENE_E',title:'THE PILE WAKES UP',speaker:'PROFESSOR DOT',actor:'HELPER_06',lines:['THE PARCELS STARTED TO RATTLE.','THE SHELVES BEGAN TO LEAN.','SOMETHING IN THE BACK ROOM','STAMPED ITS OWN CLAIM TICKET.'],item:'ITEM_12'},
  {id:'SCENE_F',altId:'SCENE_G',title:'YOUR FIRST SHIFT',speaker:'THE BACK DESK',actor:'HELPER_02',lines:['THE OLD CLERK LEFT ONE NOTE:','RETURN WHAT YOU CAN.','SORT THE REST. NEVER OPEN','THE IMPORTANT BOX. SOMEONE WAITS.'],item:'ITEM_12',noticeBoard:true}
];
DATA.descriptions={SKILL_ODDS_2:'SKILL_ODDS_2 tilts uncertain handovers toward a favorable desk ruling.'};
DATA.legacyIds={UPGRADE_AUTO_POKE_1:'UPGRADE_AUTOPOKE_1'};
DATA.describeId=id=>DATA.descriptions[DATA.legacyIds[id]||id]||'';
