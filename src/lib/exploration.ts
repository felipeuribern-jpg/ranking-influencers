import type { LanguageCode } from "../../site.config";
// Broad browsing groups derived from the existing editorial topic, never from personal traits.
const rules = [
 ["gaming", /gaming|videojuegos|streaming/i],
 ["humor", /humor|comedia|bromas|memes|reacciones/i],
 ["music", /música|baile/i],
 ["style", /moda|belleza|maquillaje/i],
 ["life", /vida|vlogs|familia|hogar|pareja|decoración|diy/i],
 ["travel", /viaj|aventur|naturaleza|camping|exploración/i],
 ["food", /cocina|gastronomía|comida|snacks/i],
 ["sport", /fitness|fútbol|deport|entrenamiento/i],
 ["ideas", /actualidad|opinión|noticias|polític|periodismo|historia|educación|ciencia|negocios|finanzas|emprendimiento|medicina|salud|psicología|religión|fe y|nutrición/i],
] as const;
export const categoryIds = [...rules.map(([id]) => id), "other"];
export function categoriesFor(topic: string): string[] {
 const matches = rules.filter(([, pattern]) => pattern.test(topic)).map(([id]) => id);
 return matches.length ? matches : ["other"];
}
export const categoryLabels: Record<LanguageCode, string[]> = {
 es: ["Gaming y streaming","Humor","Música y baile","Moda y belleza","Estilo de vida","Viajes y aventura","Gastronomía","Deporte y fitness","Ideas y actualidad","Otros temas"],
 en: ["Gaming and streaming","Comedy","Music and dance","Fashion and beauty","Lifestyle","Travel and adventure","Food","Sports and fitness","Ideas and current affairs","Other topics"],
 pt: ["Jogos e streaming","Humor","Música e dança","Moda e beleza","Estilo de vida","Viagens e aventura","Gastronomia","Esporte e fitness","Ideias e atualidades","Outros temas"],
 fr: ["Jeux et streaming","Humour","Musique et danse","Mode et beauté","Style de vie","Voyages et aventure","Gastronomie","Sport et fitness","Idées et actualité","Autres thèmes"],
 de: ["Gaming und Streaming","Humor","Musik und Tanz","Mode und Schönheit","Lifestyle","Reisen und Abenteuer","Essen","Sport und Fitness","Ideen und Aktuelles","Weitere Themen"],
 ru: ["Игры и стриминг","Юмор","Музыка и танцы","Мода и красота","Образ жизни","Путешествия и приключения","Еда","Спорт и фитнес","Идеи и события","Другие темы"],
 ar: ["ألعاب وبث مباشر","كوميديا","موسيقى ورقص","موضة وجمال","أسلوب حياة","سفر ومغامرات","طعام","رياضة ولياقة","أفكار وأحداث","مواضيع أخرى"],
 hi: ["गेमिंग और स्ट्रीमिंग","हास्य","संगीत और नृत्य","फ़ैशन और सौंदर्य","जीवनशैली","यात्रा और रोमांच","खान-पान","खेल और फ़िटनेस","विचार और समसामयिक विषय","अन्य विषय"],
 zh: ["游戏与直播","喜剧","音乐与舞蹈","时尚与美妆","生活方式","旅行与探险","美食","运动与健身","观点与时事","其他主题"],
 ja: ["ゲームと配信","コメディ","音楽とダンス","ファッションと美容","ライフスタイル","旅行と冒険","グルメ","スポーツとフィットネス","考え方と時事","その他"]
};
// more filters, sound on, mute, followers, engagement
export const interfaceLabels: Record<LanguageCode, string[]> = {
 es:["Más filtros","Activar sonido","Silenciar","Seguidores","Interacción"],
 en:["More filters","Enable sound","Mute","Followers","Engagement"],
 pt:["Mais filtros","Ativar som","Silenciar","Seguidores","Interação"],
 fr:["Plus de filtres","Activer le son","Couper le son","Abonnés","Engagement"],
 de:["Weitere Filter","Ton einschalten","Stummschalten","Follower","Interaktion"],
 ru:["Ещё фильтры","Включить звук","Выключить звук","Подписчики","Вовлечённость"],
 ar:["المزيد من الفلاتر","تشغيل الصوت","كتم الصوت","المتابعون","التفاعل"],
 hi:["अधिक फ़िल्टर","आवाज़ चालू करें","म्यूट करें","फ़ॉलोअर","सहभागिता"],
 zh:["更多筛选","开启声音","静音","关注者","互动率"],
 ja:["詳細フィルター","音声をオン","ミュート","フォロワー","エンゲージメント"]
};
