// What the delivery riders say (world/ebikeView.js decides when): on the phone to a customer, a shop,
// home; at Linger's hatch to the barista; to someone in their way. [who, zh, en] lines, voiced ahead of
// time like every scripted line (tools/voice/extract.mjs picks them up). Numbers are written out in
// characters, as they're said: an order's last four digits (尾号), minutes. The platforms are the
// game's own (no real company's name or jingle); the app's voice is a generic order alert.
// Shanghainese ({ t, lang: 'wuu', gloss, en }): an older local rider, subtitles only (no voice has it).

// on a call, riding (the phone wedged under the helmet) or stopped
export const RIDER_CALLS = [
  ['rider', '喂，您好，外卖到了，您方便下来拿一下吗？', 'Hello, your delivery\'s here. Could you come down for it?'],
  ['rider', '您好，我是骑手，您的餐已经取到了，十分钟左右到。', 'Hi, I\'m your rider. I\'ve got your food, about ten minutes.'],
  ['rider', '喂？对对对，汉口路这边，马上到，马上到。', 'Hello? Yes, yes, on Hankou Road, nearly there, nearly there.'],
  ['rider', '门口保安不让进，我给您放外卖柜里可以吗？', 'The guard won\'t let me in. Can I leave it in the delivery locker?'],
  ['rider', '不好意思啊，店里出餐慢了，我尽快给您送过去。', 'Sorry, the shop was slow with it. I\'ll get it to you as fast as I can.'],
  ['rider', '您好，您这个地址写的是几号楼啊？', 'Hello, which building number is it on your address?'],
  ['rider', '好的好的，放门口是吧？行，我拍个照给您。', 'OK, OK, leave it at the door? Sure, I\'ll send you a photo.'],
  ['rider', '喂，老婆，我今天晚点回来，单子多。', 'Hey love, I\'ll be late tonight. Lots of orders.'],
  ['rider', '妈，我在送单呢，晚上再给你打过去啊。', 'Mum, I\'m on a delivery. I\'ll call you back tonight.'],
  ['rider', '喂，站长，这单要超时了，能不能帮我报备一下？', 'Hello, boss, this one\'s going to be late. Can you log it for me?'],
  ['rider', '您好，您点的奶茶少冰是吧？好的，没问题。', 'Hello, your milk tea was less ice, right? OK, no problem.'],
  ['rider', '我到楼下了，您电话一直占线，我在门口等您。', 'I\'m downstairs. Your line\'s been busy, I\'ll wait at the door.'],
];
// the rider's phone itself, out loud (the app's order alerts)
export const RIDER_APP = [
  ['riderapp', '您有新的订单，请及时处理。', 'You have a new order. Please deal with it promptly.'],
  ['riderapp', '您有一个订单即将超时，请尽快送达。', 'An order is about to run late. Please deliver it as soon as you can.'],
  ['riderapp', '已到达取餐点，请尽快取餐。', 'You\'ve reached the pickup. Please collect the order.'],
];
// at Linger's hatch: the rider, then the barista
export const RIDER_HATCH = [
  ['rider', '你好，取外卖，尾号三八二一。', 'Hi, picking up a delivery, ending three-eight-two-one.'],
  ['rider', '你好，外卖，尾号零六五七，好了吗？', 'Hi, delivery, ending zero-six-five-seven. Is it ready?'],
  ['rider', '麻烦看一下，尾号九九一四，两杯拿铁。', 'Could you check, ending nine-nine-one-four, two lattes.'],
];
export const RIDER_HURRY = [
  ['rider', '还要多久啊？我这单快超时了。', 'How much longer? This order\'s about to run late.'],
  ['rider', '麻烦快一点啊，谢谢谢谢。', 'A bit quicker if you can, thanks, thanks.'],
];
export const BARISTA_HANDOVER = [
  ['barista', '您的外卖，拿好，慢走。', 'Here\'s your order. Take care.'],
  ['barista', '久等了，这是您的，拿好。', 'Sorry for the wait, here you are.'],
];
export const RIDER_THANKS = [
  ['rider', '好嘞，谢谢！', 'Great, thanks!'],
  ['rider', '谢谢啊！', 'Thanks!'],
];
// coming back out of a shop with the order, on the phone to the customer
export const RIDER_OUT = [
  ['rider', '喂，您好，餐我拿到了，现在给您送过去。', 'Hello, I\'ve got your order, bringing it over now.'],
  ['rider', '喂？哎，取到了取到了，十五分钟。', 'Hello? Yes, got it, got it. Fifteen minutes.'],
];
// someone in the way
export const RIDER_PASS = [
  ['rider', '借过借过！', 'Coming through!'],
  ['rider', '让一下，让一下！', 'Mind out, mind out!'],
  ['rider', '小心啊！', 'Careful!'],
];
// an older Shanghainese rider, on a call (subtitles only)
export const RIDER_WUU = [
  { t: '喂，阿姨，侬个物事到了，我摆辣门口好伐？', lang: 'wuu', gloss: '喂，阿姨，您的东西到了，我放在门口好吗？', en: 'Hello, auntie, your things are here. Shall I leave them at the door?' },
  { t: '晓得了晓得了，五分钟就到，侬覅急。', lang: 'wuu', gloss: '知道了知道了，五分钟就到，您别急。', en: 'I know, I know, five minutes, don\'t worry.' },
];
