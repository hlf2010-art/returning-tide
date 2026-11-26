// What the people in the AIA lobby say (world/aiaLife.js places them and runs the talk). Data only, so the voice
// tools can read it (tools/voice/extract.mjs). Mandarin lines are voiced; Shanghainese ('wuu') is subtitled, with a
// Mandarin gloss for Chinese readers. The insurance in it is the ordinary business of a life insurer here, with no
// real policy named: critical illness and disclosure, medical cover past the company plan, budgets, increasing
// whole life and cash values, cover after heart stents and the city's 沪惠保, claims by phone, group benefits,
// underwriting follow-ups and the recorded sale (双录).
// who's who: speaker labels { zh, en }, and the voice cast key (tools/voice/cast.json)
export const WHO = {
  zhou: { zh: '周顾问', en: 'Ms Zhou (agent)' }, wife: { zh: '李太太', en: 'Mrs Li' }, husband: { zh: '李先生', en: 'Mr Li' },
  shen: { zh: '沈顾问', en: 'Ms Shen (agent)' }, auntie: { zh: '阿姨', en: 'Auntie' }, uncle: { zh: '老伯伯', en: 'Old gentleman' },
  lin: { zh: '林经理', en: 'Ms Lin (benefits)' }, wang: { zh: '王总', en: 'Ms Wang (HR director)' }, chen: { zh: '小陈', en: 'Xiao Chen (agent)' },
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
      ['shen', '阿姨，格么可以看看增额终身寿，钞票放进去慢慢叫涨，以后孙子读书、结婚侪好派用场。', 'Then have a look at increasing whole life, Auntie. The money grows slowly in there, and later it\'s there for his studies or his wedding.', 'wuu', '阿姨，那可以看看增额终身寿，钱放进去慢慢涨，以后孙子读书、结婚都用得上。'],
      ['uncle', '现金价值是写辣合同里额伐？阿拉勿要听口头讲讲额。', 'Is the cash value written in the contract? We don\'t want promises that are only spoken.', 'wuu', '现金价值是写在合同里的吗？我们不要听口头说说的。'],
      ['shen', '写辣额，每年额现金价值表侪印辣合同后头，保证额部分一分勿会少。', 'It\'s written down. The cash value for every year is printed at the back of the contract, and the guaranteed part won\'t be a cent less.', 'wuu', '写着的，每年的现金价值表都印在合同后面，保证的部分一分不会少。']],
    [['uncle', '我旧年装了两只支架，现在还好买医疗险伐？', 'I had two stents put in last year. Can I still buy medical insurance?', 'wuu', '我去年装了两个支架，现在还能买医疗险吗？'],
      ['shen', '叔叔，装过心脏支架的话，普通医疗险核保会比较难。可以先靠沪惠保这种不限既往症的兜底，再配一份防癌医疗。', 'Uncle, with heart stents, ordinary medical cover is hard to get through underwriting. Lean first on the city\'s 沪惠保, which doesn\'t exclude past illnesses, then add a cancer-only medical plan.'],
      ['auntie', '沪惠保阿拉旧年就买了，一年一百多块，便宜额。', 'We bought 沪惠保 last year already. A hundred-odd yuan a year, cheap.', 'wuu', '沪惠保我们去年就买了，一年一百多块，便宜的。'],
      ['shen', '对额，格个先保底，其他额阿拉慢慢叫配。', 'Right. That\'s the floor; we\'ll add the rest bit by bit.', 'wuu', '对的，这个先保底，其他的我们慢慢配。']],
    [['uncle', '友邦是老牌子了，阿拉爷爷辰光就晓得，老早就辣外滩。', 'AIA\'s an old name. Our grandfathers knew it; it was on the Bund long ago.', 'wuu', '友邦是老牌子了，我们爷爷那时候就知道，很早就在外滩。'],
      ['shen', '是额，一九一九年就辣上海起家额，二〇二〇年变成外资独资额人寿公司。', 'That\'s right. It started in Shanghai in 1919, and in 2020 it became a wholly foreign-owned life company.', 'wuu', '是的，一九一九年就在上海起家的，二〇二〇年成了外资独资的人寿公司。'],
      ['auntie', '格么理赔爽气伐？阿拉隔壁老王等了交关辰光。', 'And do they pay claims promptly? Old Wang next door waited ages.', 'wuu', '那理赔爽快吗？我们隔壁老王等了好长时间。'],
      ['shen', '小额理赔在手机上拍照上传就可以，材料齐全的话一般几天就到账。', 'For small claims you just photograph the papers and upload them on your phone; with everything complete it\'s usually paid within a few days.']],
  ],
  rec: [
    [['lin', '王总您好，这边请，会议室在三楼。麻烦先在前台登记一下访客。', 'Mr Wang, hello, this way please. The meeting room is on the third floor. Could you register at the desk first?'],
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
