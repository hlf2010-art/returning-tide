// The words of the row outside the Peace Hotel (world/confrontation.js plays them; engine/fight.js
// decides where they lead). Pure content, no three.js: lines are [who, 中文, English], written in
// Chinese first, the way people talk in a late-night row on Nanjing Road.
//   drunk  a man in his forties, out of a long client dinner      girl   the young woman he won't let go
//   film   a bystander with his phone up                          guard  the hotel's security
//   cop / cop2  the officers who come                             op     the 110 operator      me  you
export const FIGHT_NAMES = {
  drunk: ['醉汉', 'Drunk man'], girl: ['女生', 'Young woman'], film: ['路人', 'Bystander'], guard: ['酒店保安', 'Hotel security'],
  cop: ['民警', 'Police officer'], cop2: ['辅警', 'Auxiliary officer'], op: ['110 接警员', '110 operator'], me: ['你', 'You'], doorman: ['保安', 'Security'],
};
// overheard as you come near, before you've done anything
export const NOTICE = [
  ['drunk', '加个信语怎么了？我又不是坏人！', "Add me on Xinyu, what's the harm? I'm not a bad guy!"],
  ['girl', '我说了不加。你让一下。', 'I said no. Let me past.'],
  ['drunk', '哎哟，还挺有脾气。走什么走，话还没讲完呢！', "Ooh, a temper on her. Where're you going? I'm not done talking!"],
  ['girl', '你别拉我！', "Don't grab me!"],
  ['drunk', '陪我喝一杯，就一杯，喝完就让你走。', 'One drink with me. Just one. Then you can go.'],
  ['girl', '我车马上到了，你松手。', "My car's nearly here. Let go of me."],
];
export const PROMPT = { target: ['一个拦着女生不放的醉汉', 'A drunk man who won\'t let a woman go'], action: ['上前', 'Step in'] };

// what you can say or do at each point (engine/fight.js NODES): move -> [中文, English]
export const SAY = {
  calm: ['大哥，喝多了吧。人家不愿意，算了算了。', "You've had a few, mate. She's not interested. Leave it."],
  shield: ['［站到两人中间］她跟我一起的。走吧。', "[Step between them] She's with me. Come on."],
  help: ['［回头找人］你等着，我叫人。', "[Look round for help] Wait there. I'm getting someone."],
  leave: ['［走开］……不关我的事。', '[Walk away] …Not my problem.'],
  face: ['两千万的单子，恭喜。这么晚了，家里人该等急了。我帮你叫个车。', "Twenty million. Congratulations. It's late, though, and they'll be waiting up for you at home. Let me get you a car."],
  cameras: ['门口全是摄像头，那边还有人在拍。闹到派出所，明天酒醒了难看的是你。', "There are cameras all over this door, and someone's filming over there. If this ends at the police station, you're the one who looks bad once you've sobered up."],
  threat: ['你再碰她一下试试。', 'Touch her again and see what happens.'],
  police: ['［拿出手机］我报警了。', "[Take out your phone] I'm calling the police."],
  open: ['［不还手，手摊开］我不跟你动手。你走你的，她走她的。', "[Don't hit back; palms open] I'm not going to fight you. You go your way, she goes hers."],
  shove: ['［推回去］手拿开。', '[Shove him back] Hands off.'],
  security: ['［朝酒店门口喊］保安！这边有人闹事！', "[Shout to the hotel door] Security! There's trouble out here!"],
  strike: ['［先动手］', '[Hit him first]'],
  guard: ['［抬起手，等他来］', '[Get your hands up and let him come]'],
  backdown: ['［退一步，手摊开］行，你厉害。我不跟喝醉的人计较。', "[Step back, palms open] All right. You win. I don't argue with drunk men."],
};
// in the help node the police option is the call itself
export const SAY_HELP = { police: ['［打 110］', '[Dial 110]'] };

// what is said after each move. { shove: n } and { fled: true } are stage directions (he shoves you; she slips away).
export const OPEN = [
  ['drunk', '看什么看？关你屁事啊？', "What're you looking at? This any of your damn business?"],
  ['girl', '我不认识他。他拦着我不让走。', "I don't know him. He won't let me leave."],
];
export const OPEN_WITH = [                                    // she is with you
  ['drunk', '看什么看？关你屁事啊？', "What're you looking at? This any of your damn business?"],
  ['girl', '他撞了我，还不让我走。', "He walked into me, and now he won't let me go."],
];
export const AFTER_MOVE = {
  calm: [
    ['drunk', '你谁啊你？我跟小姑娘讲话，轮得到你插嘴？', "Who the hell are you? I'm talking to the young lady. Nobody asked you."],
    ['drunk', '我今天签了两千万的单子，你晓得吧？两千万！', 'I signed a twenty-million deal today, you know that? Twenty million!'],
  ],
  face: [
    ['drunk', '……叫什么车，我自己会叫。', '…I can get my own car.'],
    ['drunk', '我跟你讲，我是被那帮人灌的。我平时不这样。', "I'm telling you, that lot kept filling my glass. I'm not like this."],
    ['drunk', '行了行了，没意思。走了。', "All right, all right. Forget it. I'm off."],
    ['girl', '谢谢你……真的谢谢。', 'Thank you… really. Thank you.'],
  ],
  cameras: [
    ['drunk', '拍？拍什么拍！', "Filming? What're you filming for!"],
    ['drunk', '行，你有种。今天算我倒霉。', "Fine. You've got some nerve. Just my luck tonight."],
    ['girl', '谢谢。吓死我了。', 'Thanks. That scared the life out of me.'],
  ],
  threat: [
    ['drunk', '试试就试试！', "Go on then! Let's see!"], { shove: 1 },
    ['drunk', '来啊！你不是很能吗？', 'Come on! Thought you were the big man?'],
  ],
  backdown: [
    ['drunk', '怂了吧？哈！', 'Lost your nerve? Ha!'], { fled: true },
    ['drunk', '……人呢？', "…Where'd she go?"],
    ['drunk', '没劲。', 'Boring.'],
  ],
  shield: [
    ['drunk', '哟，英雄救美是吧？', 'Oh, a hero, is it?'], { shove: 0.7 },
    ['drunk', '你算老几？', "Who d'you think you are?"],
  ],
  open: [
    { shove: 0.5 },
    ['film', '哎哎哎，别动手啊！我录着呢！', "Hey, hey, hands off him! I'm recording this!"],
    ['drunk', '录！你录！……', 'Record it! Go on! …'],
    ['drunk', '……神经病。一个两个都是神经病。', '…Lunatics. The lot of you.'],
    ['girl', '你没事吧？他推了你两下。', 'Are you all right? He pushed you twice.'],
  ],
  shove: [['drunk', '你敢推我？！', 'You push ME?!']],
  strike: [], help: [],
  guard: [['drunk', '我今天非教教你不可！', "I'm going to teach you something tonight!"]],
  snap: [['drunk', '报警？手机给我放下！', 'Police? Put that phone down!']],          // you called 110 with his hands already on you
  security: [
    ['drunk', '叫保安？你叫啊！我在里面一晚上花了八千！', 'Security? Go on, call them! I spent eight thousand in there tonight!'],
    { guard: true },
    ['guard', '先生，先生。有话好好说，别在门口闹。', "Sir. Sir. Let's talk about it. Not out here on the door."],
    ['guard', '这位小姐不想跟您说话。您再这样，我们只能报警了。', "The lady doesn't want to talk to you. Carry on and we'll have to call the police."],
    ['drunk', '……行，你们和平饭店了不起。', '…Fine. The mighty Peace Hotel.'],
    ['guard', '我送您到路口，帮您叫车。这边请。', "I'll walk you to the corner and get you a car. This way, please."],
    ['girl', '谢谢你帮我叫人。我腿都软了。', 'Thank you for fetching him. My legs have gone.'],
  ],
  police: [
    ['op', '110，请讲。', '110. Go ahead.'],
    ['me', '南京东路外滩口，和平饭店门口。有个喝醉的男的拉着一个女生不让走。', "Nanjing Road East at the Bund, outside the Peace Hotel. A drunk man's got hold of a young woman and won't let her leave."],
    ['op', '位置收到，民警马上到。请注意自身安全，不要和对方发生冲突。', "Location received. Officers are on their way. Keep yourself safe and don't get into it with him."],
    ['drunk', '报警？……神经病，多管闲事。', 'The police? …Lunatic. Mind your own business.'],
  ],
  leave: [
    ['drunk', '走走走，没你的事！', 'Go on, off you go. Nothing to do with you!'],
    ['girl', '哎，你……', 'Wait, you…'],
  ],
};
// the officers, when you called and nobody was hit
export const POLICE_CALLED = {
  line: ['几分钟后', 'A few minutes later'],
  before: [['cop', '谁报的警？', 'Who made the call?']],
  ask: [
    { set: 'straight', zh: '我报的。那人往河南路方向走了，深色外套，喝了不少。', en: 'I did. He went off toward Henan Road. Dark jacket, very drunk.' },
    { set: 'little', zh: '我报的。人已经走了，没事了。', en: "I did. He's gone. It's fine now." },
  ],
  after: [
    ['cop', '好。两位留个电话，做个登记。', "Right. I'll take a number from each of you for the record."],
    ['cop', '以后碰到这种事，报警是对的。别自己上手。', "Next time something like this happens, calling us is the right thing. Don't step in yourself."],
    ['girl', '谢谢你。要不是你，我真不知道怎么办。', "Thank you. I don't know what I'd have done."],
  ],
};
// during the blows (shown as passing remarks)
export const BARKS = {
  start: ['drunk', '来啊！', 'Come on, then!'],
  crowd: ['film', '打起来了打起来了！', "They're fighting! They're fighting!"],
  stagger: ['drunk', '哎哟……', 'Agh…'],
  gassed: ['drunk', '你……你等着……', 'You… you just wait…'],
  yield: ['drunk', '行行行，不打了，不打了！', "All right, all right! Enough! I'm done!"],
  cheap: ['film', '人家都说不打了！', "He said he'd had enough!"],
};
// how it ends on the street: outcome (or outcome:how) -> lines. R: the result so far.
export function aftermath(R) {
  switch (`${R.outcome}:${R.how}`) {
    case 'won:backed': return [['drunk', '你等着……我记住你了。', "You wait… I'll remember you."],
      R.started === 'you' ? ['film', '我可都拍下来了啊。是你先动的手。', "I got all of that, you know. You hit him first."] : ['film', '我都拍下来了。是他先动的手。', 'I got all of it. He swung first.']];
    case 'won:spent': return [['drunk', '不打了……喘不上气……', "No more… can't breathe…"], ['film', '可以啊兄弟，一下都没还手。', 'Fair play, mate. You never hit him once.']];
    case 'won:dropped': return [['film', '哎，人倒了！别打了！', "Hey, he's down! Stop!"], ['film', '谁打个 120……我报警了啊。', "Somebody call an ambulance… I'm calling the police."]];
    case 'broke:away': return [['drunk', '跑什么跑！回来！', "Where're you running to! Get back here!"]];
    case 'down:floored': return [['film', '别打了别打了！人都倒了！', "Stop! Stop it! He's down!"], ['guard', '住手！已经报警了！', "That's enough! The police have been called!"]];
    default: return [['guard', '够了！都住手！', 'Enough! Both of you, stop!'], ['guard', '已经报警了。谁也别走。', 'The police are on their way. Nobody leaves.']];
  }
}
// the officers, after blows. R: the result so far (before your statement)
export function policeScene(R) {
  const yours = R.started === 'you';
  return {
    line: R.outcome === 'down' ? ['急诊室', 'A&E'] : ['十分钟后', 'Ten minutes later'],
    before: R.outcome === 'down'
      ? [['cop', '醒了？你在南京路上被人打倒了，120 送来的。', 'Awake? You were knocked down on Nanjing Road. The ambulance brought you in.'], ['cop', '缝针之前先问你一句：谁先动的手？', 'One question before they stitch you: who threw the first punch?']]
      : [['cop', '都别动。身份证。', 'Nobody move. ID cards.'], ['cop', '谁先动的手？', 'Who threw the first punch?']],
    ask: [
      { set: 'straight', ...(yours ? { zh: '我先动的手。他拉着人家女生不放，我没忍住。', en: "I did. He had hold of the girl and wouldn't let go, and I lost it." }
        : R.landed ? { zh: '他先动的手。我还手了，这个我认。', en: "He did. I hit back. I'm not denying that." } : { zh: '他先动的手。我一下都没还。', en: 'He did. I never hit him back.' }) },
      { set: 'shade', zh: '他先动的手，我只是自卫。', en: 'He started it. I was only defending myself.' },
      { set: 'little', zh: '我想先处理一下伤，其他的按程序来。', en: "I'd like to get this seen to first. The rest can go by the book." },
    ],
  };
}
// what they decide, said aloud. V: engine/fight.js policeVerdict
export function verdictLines(R, V) {
  if (V.verdict === 'statement') return [['cop', R.landed ? '视频我们看了，情况清楚。人我们带走。' : '视频我们看了，你没还手。人我们带走。', R.landed ? "We've seen the video. It's clear enough. We're taking him in." : "We've seen the video. You didn't hit back. We're taking him in."],
    ['cop', '你跟我们回所里做个笔录，很快。', "Come back to the station and give a statement. It won't take long."]];
  if (V.verdict === 'warning') return V.lied
    ? [['cop', '没有探头拍到，他喝成这样也说不清。算互殴，回所里调解。', "No camera caught it and he's too drunk to say. We'll call it an affray and mediate at the station."]]
    : [['cop', '他先动的手不假。可你也动了手，这就叫互殴。', "He swung first, true. But you swung too, and that makes it an affray. Both of you."],
      ['cop', '回所里调解。这次口头警告，再有下次就不是说两句的事了。', "We'll mediate at the station. A verbal warning this time. Next time it won't end with a talking-to."]];
  if (V.lied) return [['cop2', '视频里可不是这么回事。', "That's not what the video shows."],
    ['cop', '殴打他人，还不说实话。回所里，按《治安管理处罚法》处理，罚款五百。', 'Striking another person, and not telling the truth about it. Back to the station. Under the Public Security Administration Punishments Law, a five-hundred-yuan fine.']];
  if (V.fine < 500) return [['cop', '认得倒是痛快。殴打他人，回所里处理。态度好，从轻，罚款两百。', "At least you own up to it. Striking another person: back to the station. You've been straight with us, so it's the lighter end. Two hundred yuan."]];
  return [['cop', '殴打他人。回所里，按《治安管理处罚法》处理，罚款五百。', 'Striking another person. Back to the station. Under the Public Security Administration Punishments Law, a five-hundred-yuan fine.']];
}
// the fade afterwards: where the time went. minutes: how long; clock: when you come out
export function lostTime(R, clock) {
  if (R.hospital) return [`急诊室，然后是派出所 · 出来时已经 ${clock}`, `A&E, then the police station · you come out at ${clock}`];
  if (R.police && R.police.verdict !== 'statement') return [`派出所 · 出来时已经 ${clock}`, `The police station · you come out at ${clock}`];
  if (R.police && R.blows) return [`派出所，做笔录 · ${clock}`, `The police station, a statement · ${clock}`];
  if (R.police) return [`登记，留电话 · ${clock}`, `A form, a phone number · ${clock}`];
  return ['', ''];
}
// what stays with you as you walk away
export function closing(R) {
  const k = R.outcome === 'won' ? `won:${R.how}` : R.outcome;
  return {
    talked: ['手心全是汗。可没人挨打。', 'Your palms are wet. But nobody got hit.'],
    stood: ['胸口被推的地方还在发烫。你一下都没还。', 'Your chest still burns where he shoved you. You never gave one back.'],
    security: ['保安一句话就办成的事，你差点自己上。', 'One sentence from security did it. You nearly went in yourself.'],
    police: ['登记，留电话。二十分钟就这么没了。可这是对的。', 'A form, a phone number. Twenty minutes gone. It was still the right call.'],
    walked: ['你往前走。身后她的声音还在响。', 'You keep walking. Behind you, her voice goes on.'],
    passed: ['你绕开了。那不是你的事。大概吧。', "You went round them. It wasn't your business. Probably."],
    'won:backed': ['指关节破了。心跳停不下来。这不像赢了什么。', "Your knuckles are split. Your heart won't slow down. It doesn't feel like winning anything."],
    'won:spent': ['你一拳都没出。他自己把自己打累了。', 'You never threw a punch. He wore himself out.'],
    'won:dropped': ['他躺在地上不动了。你的手在抖。', "He's on the ground, not moving. Your hands are shaking."],
    broke: ['你跑出半条街才停下来。这没什么丢人的。', "You're half a street away before you stop. There's no shame in it."],
    down: ['缝了四针。镜子里这张脸，明天还要去上班。', 'Four stitches. The face in the mirror has to go to work tomorrow.'],
    separated: ['有人把你们拉开了。要是没人拉呢？', 'Somebody pulled you apart. And if nobody had?'],
  }[k] || ['', ''];
}
// the next day at the hotel door: the security man on the door has heard (or seen your face)
export function doormanLine(R, level) {
  if (level >= 2) return ['纪先生，您这脸……要紧吗？要不要我叫医生？', 'Mr Ji, your face… is it bad? Shall I call a doctor?'];
  if (R.outcome === 'walked' || R.outcome === 'passed') return ['昨晚门口有个喝醉的闹事，后来警察都来了。您没碰上吧？', "There was a drunk making trouble out front last night. The police came in the end. You didn't run into it, sir?"];
  if (!R.blows) return ['纪先生，昨晚的事，谢谢您。那位小姐后来安全上车了。', 'Mr Ji. About last night: thank you. The young lady got safely into her car.'];
  return ['纪先生……昨晚的事，经理让我问问您有没有受伤。', "Mr Ji… about last night. The manager asked me to check you weren't hurt."];
}
export const HINT = ['F / 左键 刺拳 · R / 右键 重拳 · 空格 格挡 · A D 侧闪 · W S 进退 · 按住 Q 脱身', 'F / left click: jab · R / right click: cross · Space: guard · A D: slip · W S: in and out · hold Q: back off'];
export const MIRROR = ['镜子里：', 'In the mirror: '];
// every authored line, for the tests (both languages present) and the voice tools
export const ALL_LINES = [...NOTICE, ...OPEN, ...OPEN_WITH, ...Object.values(AFTER_MOVE).flat().filter(Array.isArray), ...POLICE_CALLED.before, ...POLICE_CALLED.after, ...Object.values(BARKS)];
