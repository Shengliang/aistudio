
export interface TopicCategory {
  category: string;
  icon: 'tang' | 'song' | 'han' | 'classic' | 'modern';
  topics: string[];
}

export const POEM_TOPICS: TopicCategory[] = [
  {
    category: "唐詩三百首 (Tang Dynasty)",
    icon: 'tang',
    topics: [
      "王勃 - 滕王閣序 (Preface to Prince Teng's Pavilion)",
      "李白 - 靜夜思 (Thoughts on a Silent Night)",
      "李白 - 將進酒 (Bring in the Wine)",
      "白居易 - 琵琶行 (Song of the Pipa)",
      "杜甫 - 春望 (Spring View)",
      "杜甫 - 登高 (Climbing High)",
      "王維 - 鹿柴 (Deer Enclosure)",
      "王維 - 九月九日憶山東兄弟",
      "孟浩然 - 春曉 (Spring Dawn)",
      "白居易 - 賦得古原草送別",
      "柳宗元 - 江雪 (River Snow)",
      "王之渙 - 登鸛雀樓",
      "杜牧 - 清明 (Qingming)",
      "李商隱 - 無題 (Untitled)",
      "賀知章 - 回鄉偶書"
    ]
  },
  {
    category: "宋詞精選 (Song Ci)",
    icon: 'song',
    topics: [
      "蘇軾 - 水調歌頭 (When Will the Moon Be Clear and Bright)",
      "蘇軾 - 念奴嬌·赤壁懷古",
      "李清照 - 聲聲慢 (Slow, Slow Song)",
      "李清照 - 一剪梅",
      "辛棄疾 - 青玉案·元夕",
      "岳飛 - 滿江紅 (River All Red)",
      "柳永 - 雨霖鈴",
      "歐陽修 - 生查子·元夕",
      "陸游 - 釵頭鳳"
    ]
  },
  {
    category: "詩經 & 楚辭 (Pre-Qin)",
    icon: 'classic',
    topics: [
      "詩經 - 關雎 (Guan Ju)",
      "詩經 - 蒹葭 (The Reeds)",
      "詩經 - 桃夭",
      "屈原 - 離騷 (Excerpts)",
      "古詩十九首 - 迢迢牽牛星"
    ]
  },
  {
    category: "漢魏六朝 (Han & Wei)",
    icon: 'han',
    topics: [
      "曹操 - 短歌行 (Short Song Style)",
      "曹操 - 龜雖壽",
      "曹植 - 七步詩 (Seven Steps Verse)",
      "陶淵明 - 飲酒 (Drinking Wine)",
      "陶淵明 - 歸園田居",
      "木蘭辭 (Ballad of Mulan)"
    ]
  },
  {
    category: "元曲 & 其他 (Yuan & Others)",
    icon: 'modern',
    topics: [
      "馬致遠 - 天淨沙·秋思",
      "關漢卿 - 竇娥冤 (Excerpt)",
      "納蘭性德 - 木蘭花·擬古決絕詞",
      "龔自珍 - 己亥雜詩"
    ]
  }
];