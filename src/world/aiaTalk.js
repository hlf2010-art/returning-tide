// What the people in the AIA lobby say (world/aiaLife.js places them and runs the talk). Data only, so the voice
// tools can read it (tools/voice/extract.mjs). Mandarin lines are voiced; Shanghainese ('wuu') is subtitled, with a
// Mandarin gloss for Chinese readers. The insurance in it is the ordinary business of a life insurer here, with no
// real policy named: critical illness and disclosure, medical cover past the company plan, budgets, participating
// whole life after the 2025 rate cut (dividends not promised, the guaranteed cash value in the contract), cover after
// heart stents (2026's products for people with conditions, the city's 沪惠保), claims by phone, the 百寿图, group
// benefits, underwriting follow-ups and the recorded sale (双录).
// who's who: speaker labels { zh, en }, and the voice cast key (tools/voice/cast.json)
export const WHO = {
  zhou: { zh: '周顾问', en: 'Ms Zhou (agent)' }, wife: { zh: '李太太', en: 'Mrs Li' }, husband: { zh: '李先生', en: 'Mr Li' },
  shen: { zh: '沈顾问', en: 'Ms Shen (agent)' }, auntie: { zh: '阿姨', en: 'Auntie' }, uncle: { zh: '老伯伯', en: 'Old gentleman' },
  lin: { zh: '林经理', en: 'Ms Lin (benefits)' }, wang: { zh: '王总', en: 'Ms Wang (HR director)' }, chen: { zh: '小陈', en: 'Xiao Chen (agent)' },
  angry: { zh: '客户', en: 'Customer' }, guard: { zh: '保安', en: 'Security' }, desk: { zh: '前台', en: 'Reception' },
  tourist: { zh: '游客', en: 'Visitor' }, rider: { zh: '外卖员', en: 'Delivery rider' }, recruit: { zh: '年轻人', en: 'Young man' },
};
// [who, zh, en] or [who, zh (Shanghainese), en, 'wuu', Mandarin gloss]
export const AIA_TALK = {
  t1: [
    [['wife', '我们主要想给我先生配一份重疾，孩子刚出生，最怕的就是家里有人生病。', 'We mainly want critical illness cover for my husband. The baby has just arrived; what we fear most is one of us falling ill.'],
      ['zhou', '理解。重疾险是确诊就一次性赔付，治疗费、收入损失都能顶上。李先生每年体检有什么异常吗？', 'I understand. Critical illness pays a lump sum on diagnosis, so it covers treatment and lost income. Mr Li, anything unusual in your yearly check-ups?'],
      ['husband', '有个甲状腺结节，医生说三级，定期复查就行。', 'A thyroid nodule. The doctor says grade three, just have it checked regularly.'],
      ['zhou', '那一定要如实告知。核保可能会加一条除外，但其他保障不受影响。千万别瞒，理赔的时候会出问题的。', 'Then you must disclose it. Underwriting may add an exclusion, but the rest of the cover stands. Never hide it: it causes trouble when you claim.']],
    [['husband', '公司有补充医疗，还需要另外买医疗险吗？', 'My company has supplementary medical. Do I still need my own medical insurance?'],
      ['zhou', '公司的团险跟着工作走，换了工作就没了。可以先配一份百万医疗兜底大病，预算够的话再看中高端医疗，私立医院和特需都能用。', 'Group cover goes with the job: change jobs and it\'s gone. Start with a million-yuan plan for the big illnesses; if the budget allows, a mid-to-high-end plan lets you use private hospitals and VIP clinics.'],
      ['wife', '特需就是不用排那么久队的吧？带孩子看病真的排怕了。', 'VIP clinics are the ones without the long queues? We\'re worn out queueing with the baby.'],
      ['zhou', '对，儿童医院的特需门诊也可以直付，不用自己先垫钱。', 'That\'s right. The children\'s hospital\'s VIP clinic too, with direct billing, so you don\'t pay first and claim later.']],
    [['wife', '一年大概要交多少保费？我们算过，家庭收入的一成左右能接受。', 'Roughly how much premium a year? We worked out that about a tenth of household income is all right.'],
      ['zhou', '这个思路很对，保费占收入百分之十左右比较稳妥。我按这个预算做两份计划书，下周带过来再对一下。', 'That\'s the right way to think: about ten percent of income is sensible. I\'ll draw up two proposals on that budget and bring them next week to go through.'],
      ['husband', '好，不着急，我们回去再商量商量。', 'Fine, no hurry. We\'ll talk it over at home.'],
      ['zhou', '应该的，买保险就是要想清楚。有什么问题随时发消息给我。', 'Of course. Insurance needs thinking through. Message me with any questions.']],
  ],
  t2: [
    [['auntie', '小沈啊，阿拉两家头退休工资够用额，就是想帮孙子存一笔钞票。', 'Xiao Shen, our two pensions are enough for us. We just want to put some money aside for our grandson.', 'wuu', '小沈啊，我们两个人退休工资够用的，就是想帮孙子存一笔钱。'],
      ['shen', '阿姨，旧年九月开始预定利率又降了，现在大家多数看分红型额终身寿：保证额部分写辣合同里，分红是浮动额。', 'Auntie, the guaranteed rates came down again last September, so most people now look at participating whole life: the guaranteed part is written into the contract, and the dividends float.', 'wuu', '阿姨，去年九月开始预定利率又降了，现在大家多数看分红型的终身寿：保证的部分写在合同里，分红是浮动的。'],
      ['uncle', '分红到底有几化？侬拍拍胸脯讲讲看。', 'So how much is the dividend really? Put your hand on your heart and tell me.', 'wuu', '分红到底有多少？你拍拍胸脯说说看。'],
      ['shen', '叔叔，分红勿保证额，演示表里额数字只是举例，我勿好瞎讲。保证额现金价值，每年侪印辣合同后头。', 'Uncle, dividends aren\'t guaranteed. The figures in the illustration are only examples; I can\'t promise you them. The guaranteed cash value for every year is printed at the back of the contract.', 'wuu', '叔叔，分红是不保证的，演示表里的数字只是举例，我不能乱说。保证的现金价值，每年都印在合同后面。']],
    [['uncle', '我旧年装了两只支架，现在还好买医疗险伐？', 'I had two stents put in last year. Can I still buy medical insurance?', 'wuu', '我去年装了两个支架，现在还能买医疗险吗？'],
      ['shen', '叔叔，装过心脏支架的话，普通医疗险核保会比较难。今年有专门给次标准体的产品了，可以先如实做健康告知试试；沪惠保不限既往症，先兜个底。', 'Uncle, with heart stents, ordinary medical cover is hard to get through underwriting. This year there are products made for people with conditions like yours, so let\'s try, with a full health declaration; and the city\'s 沪惠保 doesn\'t exclude past illnesses, so that\'s your floor.'],
      ['auntie', '沪惠保阿拉旧年就买了，一年一百多块，便宜额。', 'We bought 沪惠保 last year already. A hundred-odd yuan a year, cheap.', 'wuu', '沪惠保我们去年就买了，一年一百多块，便宜的。'],
      ['shen', '对额，格个先保底，其他额阿拉慢慢叫配。', 'Right. That\'s the floor; we\'ll add the rest bit by bit.', 'wuu', '对的，这个先保底，其他的我们慢慢配。']],
    [['uncle', '友邦是老牌子了，阿拉爷爷辰光就晓得，老早就辣外滩。', 'AIA\'s an old name. Our grandfathers knew it; it was on the Bund long ago.', 'wuu', '友邦是老牌子了，我们爷爷那时候就知道，很早就在外滩。'],
      ['shen', '是额，一九一九年就辣上海起家额，二〇二〇年变成外资独资额人寿公司。', 'That\'s right. It started in Shanghai in 1919, and in 2020 it became a wholly foreign-owned life company.', 'wuu', '是的，一九一九年就在上海起家的，二〇二〇年成了外资独资的人寿公司。'],
      ['auntie', '格么理赔爽气伐？阿拉隔壁老王等了交关辰光。', 'And do they pay claims promptly? Old Wang next door waited ages.', 'wuu', '那理赔爽快吗？我们隔壁老王等了好长时间。'],
      ['shen', '小额理赔在手机上拍照上传就可以，材料齐全的话一般几天就到账。', 'For small claims you just photograph the papers and upload them on your phone; with everything complete it\'s usually paid within a few days.']],
    [['auntie', '小沈，侬后头墙浪向额百寿图，我刚刚数过，一百只寿字，只只勿一样。', 'Xiao Shen, that 百寿图 on the wall behind you: I just counted. A hundred 寿, and not one the same.', 'wuu', '小沈，你后面墙上的百寿图，我刚刚数过，一百个寿字，个个不一样。'],
      ['shen', '是的阿姨，那是大楼九八年启用的时候特别定做的，一百个篆书的寿字，寓意福寿绵长。', 'That\'s right, Auntie. It was made specially when the building opened in \'98: a hundred 寿 in seal script, for a long and blessed life.'],
      ['uncle', '我小辰光听老人讲，进门额地方老早有两尊女神像，文革辰光敲脱了。', 'When I was small the old folk used to say there were two goddess statues just inside the door. Smashed in the Cultural Revolution.', 'wuu', '我小时候听老人说，进门的地方以前有两尊女神像，文革时候砸掉了。'],
      ['shen', '我也听说过。现在这里是全国重点文物保护单位，动一块石头都要报批的。', 'I\'ve heard that too. Now it\'s a nationally protected heritage site; you need permission to move a single stone.']],
  ],
  rec: [
    [['lin', '王总您好，这边请，会议室在三楼。麻烦先在前台登记一下访客。', 'Ms Wang, hello, this way please. The meeting room is on the third floor. Could you register at the desk first?'],
      ['wang', '好。我们今年想把员工福利重新做一下，团险方案能不能把家属也加进来？', 'Sure. We want to redo our staff benefits this year. Can the group plan cover families too?'],
      ['lin', '可以的，配偶和子女都能加。也可以做弹性福利，员工在额度里自己选保障。', 'Yes, spouses and children both. We can also do flexible benefits, where staff choose their own cover within an allowance.'],
      ['wang', '我们有几个外籍员工，境外看病也能报销吗？', 'We have a few foreign staff. Can they claim for treatment abroad?'],
      ['lin', '可以，有全球医疗的方案。等下让做员工福利的同事一起跟您过一下细节。', 'Yes, there\'s a global medical plan. In a moment I\'ll have our employee-benefits colleague go through the details with you.']],
  ],
  phone: [
    [['chen', '张姐，体检报告我收到了，核保那边还要再补一份复查报告。', 'Zhang jie, I\'ve got your check-up report. Underwriting needs one more follow-up report.'],
      ['chen', '对，医院的线上服务里就能下载，不用再跑一趟。', 'Yes, you can download it from the hospital\'s online service; no need to go in again.'],
      ['chen', '合同我们线上签，还要做个双录，就是录音录像，十分钟左右。您下午方便吗？', 'We sign the contract online, and there\'s the recorded-sale step, audio and video, about ten minutes. Are you free this afternoon?'],
      ['chen', '好嘞，那我三点给您打视频。', 'Great, I\'ll video-call you at three.']],
  ],
};

// Things that happen now and then (world/aiaLife.js runs them, one at a time, each at most once a day, in a shuffled
// order, the variants taking turns): each event's variants have the same speakers in the same order, so one
// script serves them all. A sixth element 'w' marks a line said under the breath.
export const AIA_EVENTS = {
  // a customer storms in: a claim turned down for non-disclosure / a surrender that paid back half
  complaint: [
    [['angry', '你们理赔部的人呢？叫他出来！我交了五年保费，现在说我没如实告知，一分钱不赔！', 'Where are your claims people? Get them out here! Five years of premiums, and now you say I didn\'t disclose something and won\'t pay a cent!'],
      ['desk', '先生您先别激动，我帮您联系客服经理。', 'Sir, please calm down. I\'ll call the customer service manager for you.'],
      ['angry', '别跟我打官腔！当初卖给我的时候怎么说的？什么都能赔！', 'Don\'t give me the official line! What did they say when they sold it to me? That it covered everything!'],
      ['guard', '先生，有话好好说，这里是办公区域，声音小一点。', 'Sir, let\'s talk this through calmly. This is an office; keep your voice down, please.'],
      ['lin', '王总不好意思，稍等我一下。', 'Excuse me a moment, Ms Wang.'],
      ['lin', '先生您好，我是这里的经理。您的情况我们到里面会议室详细说，好吗？', 'Hello, sir, I\'m a manager here. Let\'s go through your case properly in a meeting room inside, shall we?'],
      ['angry', '今天不给我个说法，我就不走了。', 'I\'m not leaving until I get an answer today.'],
      ['lin', '一定给您说法。保单号带了吗？我们一项一项对。', 'You\'ll get one. Have you brought your policy number? We\'ll go through it point by point.']],
    [['angry', '我要退保！退出来只有一半的钱，这算什么道理？当初说随时能取的！', 'I want to cancel! I only get half my money back. How is that fair? They said I could take it out any time!'],
      ['desk', '先生您先坐一下，我请经理马上过来。', 'Sir, please take a seat. I\'ll ask a manager to come straight away.'],
      ['angry', '坐什么坐！我妈七十多岁了，你们的人跟她说这是存款！', 'Sit? My mother is over seventy, and your people told her it was a savings deposit!'],
      ['guard', '先生，冷静一点，有问题我们会帮您处理的。', 'Sir, calm down, please. We\'ll deal with it for you.'],
      ['lin', '王总抱歉，我先处理一下，马上回来。', 'Sorry, Ms Wang. Let me deal with this; I\'ll be right back.'],
      ['lin', '先生，我是这里的经理。现金价值和退保损失，我们到里面一笔一笔给您算清楚。', 'Sir, I\'m a manager here. Let\'s go inside and work out the cash value and the surrender loss figure by figure.'],
      ['angry', '算清楚有什么用，钱又不会多出来！', 'What good is working it out? It won\'t make the money any more!'],
      ['lin', '如果当初销售有误导，我们按流程调查，查实了一定给您处理。您跟我来。', 'If you were misled when it was sold, we\'ll investigate by the book, and if it\'s confirmed we\'ll put it right. Come with me.']],
  ],
  // the young couple sign, and the agent can hardly keep still
  celebrate: [
    [['wife', '周姐，我们回去商量过了，就按上周那份计划书来。', 'Zhou jie, we talked it over at home. We\'ll go with last week\'s proposal.'],
      ['zhou', '好的！那请李太太在平板上签个名，电子保单马上发到您手机上。', 'Wonderful! Then Mrs Li, if you\'ll sign on the tablet, the e-policy goes straight to your phone.'],
      ['wife', '签好了。这下心里踏实了。', 'Signed. That\'s a weight off my mind.'],
      ['zhou', '恭喜恭喜！以后有任何理赔的事，第一时间打我电话。', 'Congratulations! Any claim, ever, call me first.'],
      ['husband', '周姐，辛苦你跑了好几趟。', 'Thanks for all the trips you made, Zhou jie.'],
      ['chen', '周姐，又签了一单？今年的MDRT稳了吧！', 'Another one signed, Zhou jie? MDRT is in the bag this year!'],
      ['zhou', '嘘，小点声！晚上请你喝奶茶。', 'Shh, not so loud! Milk tea\'s on me tonight.', 'zh', null, 'w']],
  ],
  // a client asks about a kickback; the agent takes him outside, fast
  rebate: [
    [['husband', '周姐，我朋友说在别家买，代理人会返几个点的佣金，你们这边返多少？', 'Zhou jie, a friend says if you buy elsewhere the agent gives back a few percent of the commission. How much do you give back?'],
      ['zhou', '哎，李先生，我们出去透透气，我跟您说。', 'Ah, Mr Li, let\'s step outside for some air and I\'ll explain.'],
      ['zhou', '这个千万不能说，返佣是违规的，被查到我的执业证都要被吊销的。', 'Never say that in here. Rebates are against the rules; if they find out, I lose my licence.', 'zh', null, 'w'],
      ['husband', '啊？这么严重？我还以为大家都这样。', 'What? That serious? I thought everyone did it.', 'zh', null, 'w'],
      ['zhou', '我们能给您的，就是把方案做到最合适，服务做到最好。别的真不行。', 'What I can give you is the best-fitting plan and the best service. Nothing else, honestly.', 'zh', null, 'w'],
      ['husband', '懂了懂了，那就当我没问。', 'Got it, got it. Forget I asked.', 'zh', null, 'w']],
  ],
  // the recorded sale (双录) with the retired couple: the script must be answered in full, in Mandarin
  recording: [
    [['shen', '叔叔阿姨，现在开始双录，就是录音录像。我念一段，您回答就好。请问您是否已阅读并理解保险条款，以及犹豫期的相关规定？', 'Uncle, Auntie, we\'re starting the recorded sale now, audio and video. I read, you answer. Have you read and understood the policy terms and the rules of the cooling-off period?'],
      ['uncle', '晓得额，晓得额。', 'Yes, yes, I know.', 'wuu', '知道的，知道的。'],
      ['shen', '叔叔，要用普通话完整地回答一遍：我已阅读并理解。', 'Uncle, you need to answer in full, in Mandarin: I have read and understood.'],
      ['uncle', '我……已阅读并理解。', 'I... have read and understood.'],
      ['auntie', '侬讲普通话像辣念课文。', 'Your Mandarin sounds like reading out a textbook.', 'wuu', '你说普通话像在念课文。'],
      ['shen', '没关系，很标准！我们再确认一下投保人签名，就好了。', 'That\'s fine, very proper! We just confirm the policyholder\'s signature and we\'re done.']],
  ],
  // someone wanders in to photograph the dome
  tourist: [
    [['tourist', '哇，这个穹顶也太好看了吧，全是金的！', 'Wow, look at this dome, it\'s all gold!'],
      ['guard', '不好意思，大堂可以参观，但是不能拍照哦。', 'Sorry, you\'re welcome to look round the lobby, but no photos, please.'],
      ['tourist', '就拍一张，我发个动态。', 'Just one, for my feed.'],
      ['guard', '真的不行。门口外面可以拍，外立面更好看。', 'Really, no. You can take pictures outside the door; the façade is even better.'],
      ['tourist', '好吧好吧，谢谢啊。', 'All right, all right. Thanks.']],
    [['tourist', '请问这里以前是字林西报大楼吗？我在书上看到过。', 'Excuse me, was this the North China Daily News building? I read about it in a book.'],
      ['guard', '是的，现在是友邦大厦。营业时间一楼可以进来看看，就是不能拍照。', 'Yes, it\'s the AIA Building now. In office hours you can come into the ground floor and look, just no photos.'],
      ['tourist', '那我在门口外面拍一张可以吗？', 'Can I take one from outside the door, then?'],
      ['guard', '门口可以，里面就不要拍了，谢谢配合。', 'At the door is fine, just not inside. Thanks for understanding.'],
      ['tourist', '好的好的，不打扰了。', 'Of course. Sorry to bother you.']],
  ],
  // a delivery for upstairs: riders can't go past the gates
  delivery: [
    [['rider', '你好，外卖，三楼的，麻烦让我上去一下，要超时了！', 'Hi, delivery for the third floor. Let me up, please, I\'m about to be late!'],
      ['guard', '外卖不能上楼，放门口的取餐柜，我帮你通知他们下来拿。', 'Deliveries can\'t go up. Put it in the pickup locker by the door; I\'ll tell them to come down for it.'],
      ['rider', '好嘞好嘞，谢谢大哥！', 'Right, right. Thanks, mate!']],
    [['rider', '大哥，五楼点的奶茶，二十杯，我一个人拎不上去啊。', 'Mate, twenty milk teas for the fifth floor. I can\'t carry them up on my own.'],
      ['guard', '放这儿吧，我打个电话让他们派人下来拿。', 'Leave them here. I\'ll phone up and have someone come down.'],
      ['rider', '那太感谢了，记得给个好评啊！', 'Thanks a lot. Tell them to leave a good review!']],
  ],
  // an agent sounds out a young man waiting by the door about joining (增员)
  recruit: [
    [['chen', '帅哥，等人啊？我是友邦的代理人，看你挺精神的，有没有兴趣了解一下这个职业？', 'Waiting for someone? I\'m an agent here at AIA. You look sharp; ever thought about this line of work?'],
      ['recruit', '保险啊？我刚毕业，在找工作呢。', 'Insurance? I\'ve just graduated, I\'m looking for a job.'],
      ['chen', '那正好，我们有新人培训，时间自由，收入跟着能力走。周六有个职业说明会，你来听听？', 'Perfect timing. There\'s training for newcomers, your hours are your own, and you earn what you\'re worth. There\'s a careers session on Saturday; come and listen?'],
      ['recruit', '我考虑考虑吧。', 'I\'ll think about it.'],
      ['chen', '行，加个联系方式，资料我发给你。', 'Sure. Let\'s swap contacts; I\'ll send you the details.']],
  ],
};
