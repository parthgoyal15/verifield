import type { Lang } from "./types";

// Scripted farmer-facing messages in every supported language. Used whenever Gemini is not
// writing the text itself, and stored on the message so the chat (and its speaker button)
// follows the farmer's chosen language even after they switch.
export type L10n = Record<Lang, string>;

export const tr = (l: L10n, lang: Lang) => l[lang] ?? l.en;

export const T = {
  languageSet: (): L10n => ({
    en: "Great, we will talk in English. I am Verifield. I help with crop damage: send a voice note or photos of your field any time.",
    hi: "ठीक है, अब हम हिन्दी में बात करेंगे। मैं Verifield हूँ। फसल के नुकसान में मदद करता हूँ: कभी भी आवाज़ संदेश या अपने खेत की फोटो भेजें।",
    vi: "Được rồi, chúng ta sẽ nói chuyện bằng tiếng Việt. Tôi là Verifield. Tôi giúp bạn khi mùa màng bị thiệt hại: hãy gửi tin nhắn thoại hoặc ảnh ruộng bất cứ lúc nào.",
    tl: "Sige, mag-uusap tayo sa Tagalog. Ako si Verifield. Tumutulong ako kapag nasira ang pananim: magpadala ng voice message o litrato ng iyong palayan anumang oras.",
  }),

  baselineSaved: (): L10n => ({
    en: "Thank you, your field photo is saved. Stay safe.",
    hi: "धन्यवाद, आपके खेत की फोटो सुरक्षित रख ली गई है। अपना ध्यान रखें।",
    vi: "Cảm ơn bạn, ảnh ruộng đã được lưu. Hãy giữ an toàn.",
    tl: "Salamat, naitala na ang litrato ng iyong palayan. Mag-ingat kayo.",
  }),

  appealStarted: (id: string): L10n => ({
    en: `Thank you. Claim ${id} is being checked again with your new photos.`,
    hi: `धन्यवाद। आपकी नई फोटो के साथ दावा ${id} की फिर से जाँच हो रही है।`,
    vi: `Cảm ơn bạn. Yêu cầu ${id} đang được kiểm tra lại với ảnh mới của bạn.`,
    tl: `Salamat. Sinusuri muli ang claim ${id} gamit ang iyong mga bagong litrato.`,
  }),

  alreadyHandled: (id: string): L10n => ({
    en: `Your claim ${id} is already being handled.`,
    hi: `आपके दावे ${id} पर पहले से काम चल रहा है।`,
    vi: `Yêu cầu ${id} của bạn đang được xử lý.`,
    tl: `Inaasikaso na ang iyong claim ${id}.`,
  }),

  claimFiled: (id: string): L10n => ({
    en: `Claim ${id} filed. We are now checking satellite and weather data, you will hear back in a few minutes.`,
    hi: `दावा ${id} दर्ज हो गया। हम सैटेलाइट और मौसम के आँकड़े जाँच रहे हैं, कुछ ही मिनटों में जवाब मिलेगा।`,
    vi: `Đã ghi nhận yêu cầu ${id}. Chúng tôi đang kiểm tra dữ liệu vệ tinh và thời tiết, bạn sẽ nhận phản hồi trong vài phút.`,
    tl: `Naitala na ang claim ${id}. Sinusuri namin ang satellite at datos ng panahon, makakatanggap ka ng sagot sa loob ng ilang minuto.`,
  }),

  // Mandatory claim details, asked one at a time with tap-to-answer buttons.
  detailsIntro: (): L10n => ({
    en: "Thank you, your photos are received. A few quick questions to complete your claim.",
    hi: "धन्यवाद, आपकी फोटो मिल गई हैं। दावा पूरा करने के लिए कुछ छोटे सवाल।",
    vi: "Cảm ơn bạn, chúng tôi đã nhận được ảnh. Vài câu hỏi nhanh để hoàn tất yêu cầu.",
    tl: "Salamat, natanggap na ang iyong mga litrato. Ilang mabilis na tanong para makumpleto ang claim.",
  }),
  qLossDate: (): L10n => ({
    en: "When did the damage happen?",
    hi: "नुकसान किस दिन हुआ?",
    vi: "Thiệt hại xảy ra vào ngày nào?",
    tl: "Kailan nangyari ang pinsala?",
  }),
  qCause: (): L10n => ({
    en: "What caused the damage?",
    hi: "नुकसान किस वजह से हुआ?",
    vi: "Nguyên nhân gây thiệt hại là gì?",
    tl: "Ano ang sanhi ng pinsala?",
  }),
  qArea: (field: string, ha: number): L10n => ({
    en: `How much of ${field} (${ha} ha) is damaged?`,
    hi: `${field} (${ha} हेक्टेयर) का कितना हिस्सा खराब हुआ?`,
    vi: `Bao nhiêu phần của ${field} (${ha} ha) bị thiệt hại?`,
    tl: `Gaano kalaki ng ${field} (${ha} ha) ang nasira?`,
  }),
  qLoss: (): L10n => ({
    en: "In the damaged part, how much of the crop is lost?",
    hi: "खराब हिस्से में कितनी फसल बर्बाद हुई?",
    vi: "Ở phần bị thiệt hại, bao nhiêu lúa bị mất?",
    tl: "Sa nasirang bahagi, gaano karami ng pananim ang nawala?",
  }),
  qPayout: (provider: string, phone: string): L10n => ({
    en: `Should the payout go to your registered ${provider} account (${phone})?`,
    hi: `क्या भुगतान आपके पंजीकृत ${provider} खाते (${phone}) में भेजा जाए?`,
    vi: `Tiền bồi thường có chuyển vào tài khoản ${provider} đã đăng ký (${phone}) không?`,
    tl: `Ipapadala ba ang bayad sa iyong rehistradong ${provider} account (${phone})?`,
  }),
  qDeclare: (): L10n => ({
    en: "Please check your claim details below and confirm.",
    hi: "कृपया नीचे दिए दावे के विवरण जाँचें और पुष्टि करें।",
    vi: "Vui lòng kiểm tra thông tin yêu cầu bên dưới và xác nhận.",
    tl: "Pakisuri ang mga detalye ng iyong claim sa ibaba at kumpirmahin.",
  }),
  tapOption: (): L10n => ({
    en: "Please tap one of the answers below.",
    hi: "कृपया नीचे दिए किसी एक जवाब पर दबाएँ।",
    vi: "Vui lòng chạm vào một câu trả lời bên dưới.",
    tl: "Pakipindot ang isa sa mga sagot sa ibaba.",
  }),
  photosAdded: (): L10n => ({
    en: "Photos added to your claim.",
    hi: "फोटो आपके दावे में जोड़ दी गई हैं।",
    vi: "Đã thêm ảnh vào yêu cầu của bạn.",
    tl: "Naidagdag na ang mga litrato sa iyong claim.",
  }),
  optNotSure: (): L10n => ({ en: "Not sure", hi: "पक्का नहीं पता", vi: "Không chắc", tl: "Hindi sigurado" }),
  optCause: {
    flood: { en: "Flood water", hi: "बाढ़ का पानी", vi: "Lũ lụt", tl: "Baha" },
    heavy_rain: { en: "Heavy rain", hi: "भारी बारिश", vi: "Mưa lớn", tl: "Malakas na ulan" },
    storm_wind: { en: "Storm wind", hi: "तेज़ आँधी", vi: "Gió bão", tl: "Malakas na hangin" },
    other: { en: "Something else", hi: "कुछ और", vi: "Lý do khác", tl: "Iba pa" },
  } satisfies Record<string, L10n>,
  optArea: (fraction: number, ha: number): L10n => {
    const part = {
      1: { en: "Whole field", hi: "पूरा खेत", vi: "Cả ruộng", tl: "Buong palayan" },
      0.75: { en: "About three quarters", hi: "लगभग तीन-चौथाई", vi: "Khoảng ba phần tư", tl: "Mga tatlong-kapat" },
      0.5: { en: "About half", hi: "लगभग आधा", vi: "Khoảng một nửa", tl: "Mga kalahati" },
      0.25: { en: "About a quarter", hi: "लगभग एक-चौथाई", vi: "Khoảng một phần tư", tl: "Mga isang-kapat" },
    }[fraction]!;
    const unit: L10n = { en: "ha", hi: "हेक्टेयर", vi: "ha", tl: "ha" };
    return Object.fromEntries(Object.entries(part).map(([l, t]) => [l, `${t} (${ha} ${unit[l as Lang]})`])) as L10n;
  },
  optLoss: (pct: number): L10n => {
    const part = {
      100: { en: "All of it", hi: "पूरी फसल", vi: "Mất hết", tl: "Lahat" },
      75: { en: "Most of it", hi: "ज़्यादातर", vi: "Phần lớn", tl: "Karamihan" },
      50: { en: "About half", hi: "लगभग आधी", vi: "Khoảng một nửa", tl: "Mga kalahati" },
      25: { en: "Some of it", hi: "थोड़ी", vi: "Một ít", tl: "Kaunti" },
    }[pct]!;
    return Object.fromEntries(Object.entries(part).map(([l, t]) => [l, `${t} (~${pct}%)`])) as L10n;
  },
  optPayoutYes: (provider: string): L10n => ({
    en: `Yes, send to ${provider}`,
    hi: `हाँ, ${provider} में भेजें`,
    vi: `Có, chuyển vào ${provider}`,
    tl: `Oo, ipadala sa ${provider}`,
  }),
  optPayoutNo: (): L10n => ({
    en: "No, use another account",
    hi: "नहीं, दूसरा खाता",
    vi: "Không, dùng tài khoản khác",
    tl: "Hindi, ibang account",
  }),
  declared: (): L10n => ({
    en: "✓ I confirm these details are true",
    hi: "✓ मैं पुष्टि करता/करती हूँ कि ये विवरण सही हैं",
    vi: "✓ Tôi xác nhận thông tin này là đúng",
    tl: "✓ Kinukumpirma kong totoo ang mga detalyeng ito",
  }),
  payoutHeld: (): L10n => ({
    en: "Noted. An officer will call you to update your payout account before any money is sent.",
    hi: "ठीक है। पैसा भेजने से पहले एक अधिकारी आपका भुगतान खाता बदलने के लिए फोन करेगा।",
    vi: "Đã ghi nhận. Một cán bộ sẽ gọi để cập nhật tài khoản nhận tiền trước khi chuyển.",
    tl: "Naitala. Tatawagan ka ng isang opisyal para i-update ang iyong account bago ipadala ang pera.",
  }),

  askPhotos: (): L10n => ({
    en: "Please send 2-3 photos of your field and tell us what happened.",
    hi: "कृपया अपने खेत की 2-3 फोटो भेजें और बताएँ कि क्या हुआ।",
    vi: "Vui lòng gửi 2-3 ảnh ruộng của bạn và cho biết chuyện gì đã xảy ra.",
    tl: "Pakipadala ng 2-3 litrato ng iyong palayan at sabihin kung ano ang nangyari.",
  }),

  warning: (name: { en: string; local: string }, place: { en: string; local: string }, age: number | undefined): L10n => ({
    en: `Warning: ${name.en} is expected in ${place.en} within 48 hours. Your rice is about ${age} days old: clear drainage channels and move seed stock to high ground. Please send one photo of your field now so any claim later is faster.`,
    hi: `चेतावनी: ${name.local} अगले 48 घंटों में ${place.local} पहुँच सकती है। आपका धान लगभग ${age} दिन का है: नालियाँ साफ़ रखें और बीज-खाद ऊँची जगह पर रखें। अभी अपने खेत की एक फोटो भेजें, ताकि बाद में दावा जल्दी हो।`,
    vi: `Cảnh báo: ${name.local} dự kiến đến ${place.local} trong 48 giờ tới. Lúa của bạn khoảng ${age} ngày tuổi: hãy khơi thông mương thoát nước và chuyển giống, phân bón lên chỗ cao. Hãy gửi một ảnh ruộng ngay bây giờ để việc bồi thường sau này nhanh hơn.`,
    tl: `Babala: Inaasahang darating ang ${name.local} sa ${place.local} sa loob ng 48 oras. Mga ${age} araw na ang iyong palay: linisin ang mga daluyan ng tubig at ilipat ang binhi at abono sa mataas na lugar. Magpadala ng isang litrato ng iyong palayan ngayon para mas mabilis ang claim mamaya.`,
  }),

  landfall: (name: { en: string; local: string }, place: { en: string; local: string }, insured: boolean): L10n =>
    insured
      ? {
          en: `${name.en} has passed through ${place.en}. Are you and your family safe? If your field is damaged, reply with a voice message and 2-3 photos and we will handle your claim.`,
          hi: `${name.local} ${place.local} से गुज़र चुकी है। क्या आप और आपका परिवार सुरक्षित हैं? अगर खेत को नुकसान हुआ है, तो आवाज़ संदेश और 2-3 फोटो भेजें, हम आपका दावा संभाल लेंगे।`,
          vi: `${name.local} đã đi qua ${place.local}. Bạn và gia đình có an toàn không? Nếu ruộng bị thiệt hại, hãy gửi tin nhắn thoại và 2-3 ảnh, chúng tôi sẽ lo yêu cầu bồi thường cho bạn.`,
          tl: `Dumaan na ang ${name.local} sa ${place.local}. Ligtas ba kayo ng iyong pamilya? Kung nasira ang iyong palayan, magpadala ng voice message at 2-3 litrato at kami na ang bahala sa iyong claim.`,
        }
      : {
          en: `${name.en} has passed through ${place.en}. Are you safe? You are not insured, but we can verify your damage for government relief. Send a voice message and 2-3 photos.`,
          hi: `${name.local} ${place.local} से गुज़र चुकी है। क्या आप सुरक्षित हैं? आपका बीमा नहीं है, फिर भी हम सरकारी राहत के लिए आपके नुकसान की पुष्टि कर सकते हैं। आवाज़ संदेश और 2-3 फोटो भेजें।`,
          vi: `${name.local} đã đi qua ${place.local}. Bạn có an toàn không? Bạn chưa có bảo hiểm, nhưng chúng tôi vẫn có thể xác minh thiệt hại để bạn xin hỗ trợ của nhà nước. Hãy gửi tin nhắn thoại và 2-3 ảnh.`,
          tl: `Dumaan na ang ${name.local} sa ${place.local}. Ligtas ka ba? Wala kang insurance, pero maaari pa rin naming i-verify ang pinsala para sa tulong ng gobyerno. Magpadala ng voice message at 2-3 litrato.`,
        },

  recoveryPlan: (): L10n => ({
    en: "Recovery plan: 1) Drain the field and remove rotten plants. 2) Ask the agriculture office about short-duration rice seed for this season. 3) Ask your local office about disaster seed and fertiliser support.",
    hi: "आगे की योजना: 1) खेत से पानी निकालें और सड़े पौधे हटा दें। 2) कृषि कार्यालय से इसी सीज़न के लिए जल्दी पकने वाले धान के बीज के बारे में पूछें। 3) आपदा में बीज और खाद की मदद के बारे में स्थानीय कार्यालय से पूछें।",
    vi: "Kế hoạch phục hồi: 1) Tháo nước khỏi ruộng và dọn bỏ cây bị thối. 2) Hỏi phòng nông nghiệp về giống lúa ngắn ngày cho vụ này. 3) Hỏi chính quyền địa phương về hỗ trợ giống và phân bón sau thiên tai.",
    tl: "Plano sa pagbangon: 1) Patuyuin ang palayan at alisin ang mga bulok na halaman. 2) Magtanong sa tanggapan ng agrikultura tungkol sa maikling-panahong binhi ng palay para sa season na ito. 3) Magtanong sa lokal na tanggapan tungkol sa tulong na binhi at abono para sa sakuna.",
  }),

  letterUninsuredApprove: (loss: number | undefined): L10n => ({
    en: `We verified the damage to your field (${loss}% loss). A damage certificate for government relief is ready.`,
    hi: `हमने आपके खेत के नुकसान (${loss}%) की पुष्टि कर दी है। सरकारी राहत के लिए नुकसान प्रमाणपत्र तैयार है।`,
    vi: `Chúng tôi đã xác minh thiệt hại ruộng của bạn (mất ${loss}%). Giấy chứng nhận thiệt hại để xin hỗ trợ của nhà nước đã sẵn sàng.`,
    tl: `Na-verify na namin ang pinsala sa iyong palayan (${loss}% nasira). Handa na ang sertipiko ng pinsala para sa tulong ng gobyerno.`,
  }),
  letterUninsuredReview: (id: string): L10n => ({
    en: `Thank you. An officer will check your evidence (${id}) within 3 days before the damage certificate is issued.`,
    hi: `धन्यवाद। प्रमाणपत्र जारी करने से पहले एक अधिकारी 3 दिनों के भीतर आपके सबूत (${id}) की जाँच करेगा।`,
    vi: `Cảm ơn bạn. Một cán bộ sẽ kiểm tra bằng chứng của bạn (${id}) trong vòng 3 ngày trước khi cấp giấy chứng nhận.`,
    tl: `Salamat. Susuriin ng isang opisyal ang iyong ebidensya (${id}) sa loob ng 3 araw bago ibigay ang sertipiko.`,
  }),
  letterUninsuredReject: (id: string): L10n => ({
    en: `We could not verify the damage yet (${id}). An officer will contact you. You can send new photos of your field.`,
    hi: `हम अभी नुकसान की पुष्टि नहीं कर पाए (${id})। एक अधिकारी आपसे संपर्क करेगा। आप अपने खेत की नई फोटो भेज सकते हैं।`,
    vi: `Chúng tôi chưa xác minh được thiệt hại (${id}). Một cán bộ sẽ liên hệ với bạn. Bạn có thể gửi ảnh mới của ruộng.`,
    tl: `Hindi pa namin ma-verify ang pinsala (${id}). Makikipag-ugnayan sa iyo ang isang opisyal. Maaari kang magpadala ng mga bagong litrato ng iyong palayan.`,
  }),
  letterApprove: (id: string, loss: number | undefined, advance?: { amount: string; provider: string }): L10n => ({
    en: `Your claim ${id} is verified (${loss}% loss).${advance ? ` ${advance.amount} has been sent to your ${advance.provider} wallet now.` : ""} The rest follows after final approval.`,
    hi: `आपका दावा ${id} सत्यापित हो गया है (${loss}% नुकसान)।${advance ? ` ${advance.amount} अभी आपके ${advance.provider} खाते में भेज दिए गए हैं।` : ""} बाकी राशि अंतिम मंज़ूरी के बाद मिलेगी।`,
    vi: `Yêu cầu ${id} của bạn đã được xác minh (mất ${loss}%).${advance ? ` ${advance.amount} đã được chuyển vào ví ${advance.provider} của bạn.` : ""} Phần còn lại sẽ được chuyển sau khi duyệt cuối cùng.`,
    tl: `Na-verify na ang iyong claim ${id} (${loss}% nasira).${advance ? ` Naipadala na ang ${advance.amount} sa iyong ${advance.provider} wallet.` : ""} Susunod ang natitira pagkatapos ng huling pag-apruba.`,
  }),
  letterReview: (id: string): L10n => ({
    en: `Your claim ${id} needs a quick check by an assessor. We will contact you within 3 days.`,
    hi: `आपके दावे ${id} की एक मूल्यांकनकर्ता जल्दी जाँच करेगा। हम 3 दिनों के भीतर आपसे संपर्क करेंगे।`,
    vi: `Yêu cầu ${id} cần được giám định viên kiểm tra nhanh. Chúng tôi sẽ liên hệ bạn trong vòng 3 ngày.`,
    tl: `Kailangan ng mabilis na pagsusuri ng assessor ang iyong claim ${id}. Makikipag-ugnayan kami sa loob ng 3 araw.`,
  }),
  letterReject: (id: string): L10n => ({
    en: `We could not verify claim ${id} yet. An officer will contact you. You can send more photos to appeal.`,
    hi: `हम अभी दावे ${id} की पुष्टि नहीं कर पाए। एक अधिकारी आपसे संपर्क करेगा। अपील के लिए आप और फोटो भेज सकते हैं।`,
    vi: `Chúng tôi chưa xác minh được yêu cầu ${id}. Một cán bộ sẽ liên hệ với bạn. Bạn có thể gửi thêm ảnh để khiếu nại.`,
    tl: `Hindi pa namin ma-verify ang claim ${id}. Makikipag-ugnayan sa iyo ang isang opisyal. Maaari kang magpadala ng higit pang litrato para mag-apela.`,
  }),

  certificate: (id: string): L10n => ({
    en: `The damage to your field (${id}) is verified. Your certificate for government relief is ready.`,
    hi: `आपके खेत (${id}) के नुकसान की पुष्टि हो गई है। सरकारी राहत के लिए आपका प्रमाणपत्र तैयार है।`,
    vi: `Thiệt hại ruộng của bạn (${id}) đã được xác minh. Giấy chứng nhận để xin hỗ trợ của nhà nước đã sẵn sàng.`,
    tl: `Na-verify na ang pinsala sa iyong palayan (${id}). Handa na ang iyong sertipiko para sa tulong ng gobyerno.`,
  }),
  enroll: (): L10n => ({
    en: "Protect your field next season. Enrol in crop insurance today.",
    hi: "अगले सीज़न में अपने खेत को सुरक्षित करें। आज ही फसल बीमा में नाम लिखवाएँ।",
    vi: "Bảo vệ ruộng lúa của bạn cho vụ sau. Đăng ký bảo hiểm nông nghiệp ngay hôm nay.",
    tl: "Protektahan ang iyong palayan sa susunod na season. Mag-enroll ngayon sa crop insurance.",
  }),
  advance: (amount: string, provider: string): L10n => ({
    en: `A cash advance of ${amount} has been sent to your ${provider} wallet.`,
    hi: `${amount} की अग्रिम राशि आपके ${provider} खाते में भेज दी गई है।`,
    vi: `Khoản tạm ứng ${amount} đã được chuyển vào ví ${provider} của bạn.`,
    tl: `Naipadala na ang paunang bayad na ${amount} sa iyong ${provider} wallet.`,
  }),
  settlement: (id: string): L10n => ({
    en: `Your claim ${id} is approved. The remaining payout has been sent.`,
    hi: `आपका दावा ${id} मंज़ूर हो गया है। बाकी राशि आपके खाते में भेज दी गई है।`,
    vi: `Yêu cầu bồi thường ${id} đã được duyệt. Số tiền còn lại đã được chuyển cho bạn.`,
    tl: `Naaprubahan na ang iyong claim ${id}. Naipadala na ang natitirang bayad.`,
  }),
};
