const fs = require('fs');
const path = require('path');

// Basic dotenv parser to read .env file locally without external dependencies
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach(line => {
        if (!line.trim() || line.trim().startsWith('#')) return;
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      });
      console.log('Loaded environment variables from .env');
    }
  } catch (e) {
    console.warn('Could not read .env file:', e.message);
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !GEMINI_API_KEY) {
  console.error('ERROR: Missing required environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY).');
  console.error('Please configure them in your environment or in a .env file.');
  process.exit(1);
}

// Default 36 passages from wisdom-of-the-doctors.html
const SEED_PASSAGES = {
  sales: [
    { work: "Introduction to the Devout Life", text: "Ask God to give you a great desire to please Him, and be sure that your desires themselves are a form of prayer. Be patient with everyone, but above all with yourself. I mean that you should not be discouraged by your imperfections, but always rise with fresh courage." },
    { work: "Introduction to the Devout Life", text: "Devout life is not to be separated from ordinary life. Do not wish to be anything but what you are, and try to be that perfectly. The same God who cares for you in one state also cares for you in another. Do not look forward in fear to what might come; the same everlasting Father who cares for you today will take care of you tomorrow." },
    { work: "Introduction to the Devout Life", text: "Do not lose your inward peace for anything whatsoever, even if your whole world seems upset. What is the use of being troubled? The ship is safer that is tempest-tossed but has a skilled pilot than one in calm waters with no one at the helm." },
    { work: "The Love of God", text: "The measure of love is to love without measure. True love is always accompanied by gentleness. We must all bear one another's burdens, for that is the law of Christ. Be who you are and be that well, so as to do honour to the Master Craftsman whose handiwork you are." },
    { work: "Consoling Thoughts", text: "The person who has peace in his conscience does not trouble himself as to what the world says of him. Let the world talk as much as it pleases, since God sees our heart. Have no anxiety for the future, but be busy now with the present." },
    { work: "The Love of God", text: "The will of God is the very definition of goodness itself. Nothing happens by chance with God, nothing by caprice. When you do not know what to do, simply hold still and wait on the Lord; your doubts will clear, your path will open." },
    { work: "Introduction to the Devout Life", text: "Nothing so effectually mortifies the heart as humility, and nothing so destroys it as pride. When we are angry with ourselves at our faults, it is often not because they offended God but because they embarrassed us. True humility is gentle toward oneself — and that gentleness is where all gentleness toward others is born." },
    { work: "Letters of Spiritual Direction", text: "Do not look forward to what may happen tomorrow. The same everlasting Father who cares for you today will take care of you tomorrow and every day. Either He will shield you from suffering or He will give you unfailing strength to bear it. Be at peace, and put aside all anxious thoughts." },
    { work: "The Love of God", text: "The soul truly united to God finds all things easy, because she does them through love. When we do small things through love they become great before God. The heart that loves is like a mother who never tires of her child; love makes every burden light and every path straight." },
    { work: "Introduction to the Devout Life", text: "Choose friends who are good, virtuous, and truthful. The friendship of virtue is never broken except by sin, and it grows stronger with each passing day. Do not multiply friendships; a few deep and holy bonds are worth more than many shallow ones. Those who travel together toward God travel well." },
    { work: "Consoling Thoughts", text: "Death is nothing to fear for one who has lived in God's love. It is the final surrender, the last act of trust. All our life has been a preparation for this moment of meeting. Those who die in God are not lost — they are gathered like late roses into an eternal garden." },
    { work: "The Love of God", text: "Holy indifference is not coldness; it is the warmth of a will perfectly free to follow God wherever He leads. The surrendered soul says not merely 'Thy will be done' as resignation, but as joy — for they have learned that God's will is always mercy dressed as circumstance." }
  ],
  augustine: [
    { work: "Confessions", text: "Thou madest us for Thyself, and our heart is restless until it repose in Thee. Our heart is restless, O Lord, until it finds rest in You. You have made us for yourself, and our heart is troubled until it rests in You." },
    { work: "Confessions", text: "Late have I loved Thee, O Beauty so ancient and so new, late have I loved Thee! For behold Thou wert within me, and I without, and I was seeking Thee without. Thou wert with me, and I was not with Thee." },
    { work: "Confessions", text: "Thou awakest us to delight in Thy praise; for Thou madest us for Thyself. Grant me, Lord, to know and understand which is first, to call on Thee or to praise Thee. Do Thou awaken us, and call us back, inflame us and carry us upward." },
    { work: "City of God", text: "Our heart is made for Thee, O Lord, and it will not rest until it rests in Thee. The soul of man is by its very nature capable of receiving the gift of God. Even in our sins, we are searching for God under wrong names and in wrong places." },
    { work: "Sermons on the Psalms", text: "God loves each of us as if there were only one of us. Hope has two beautiful daughters: anger and courage. Anger at the way things are, and courage to work to change them. Do not despair; many people have been saved who have come to God late." },
    { work: "Confessions", text: "The punishment of sin is sin, and the reward of virtue is virtue. Lord, make me pure — but not yet! is the prayer of those who are not yet ready to surrender. But what joy it is when we finally let go and allow God to be God in our lives." },
    { work: "Confessions", text: "Thou wert calling and crying aloud to me, shattering my deafness. Thou wert gleaming and glowing, and dispelling my blindness. You were fragrant, and I drew in breath — and now I pant after Thee. I tasted, and now I hunger and thirst. You touched me, and I burned for Thy peace." },
    { work: "On Christian Doctrine", text: "You have commanded us to love God and neighbor, and in these two all the Law is summed. Love, and do what you will: if you hold your peace, hold it through love; if you cry out, cry out through love; if you correct, correct through love. Let love be the root within you — from this root nothing but good can spring." },
    { work: "Sermons on the Psalms", text: "Sing to the Lord a new song — and this new song is the song of love. Whoever has learned to love, sings. But the old person, still captive to sin, cannot sing what is new. You must first be made new, and then you will sing what is new. The life of praise is the life of love." },
    { work: "Confessions", text: "I have learnt to love Thee late, Thou Beauty ever old and ever new. What held me far from Thee was I myself, and I myself kept myself from Thee. There is a joy which is given not to the wicked, but to those who worship Thee for Thine own sake — and Thyself art that joy." },
    { work: "City of God", text: "Two cities have been formed by two loves: the earthly by love of self to the contempt of God, the heavenly by love of God to the contempt of self. The one glories in itself, the other in the Lord. The one seeks glory from men; the other finds its highest glory in God, the witness of conscience." },
    { work: "Sermons", text: "Do not lose heart because of your sins. Even if you have sinned greatly, do not despair. I do not say to you: do not sin any more — we are all sinners. I say: do not despair. The remedy for sin is not despair but repentance, and God is always ready to receive the one who turns back." }
  ],
  therese: [
    { work: "Story of a Soul", text: "I want to find an elevator to raise me to Jesus, for I am too small to climb the rough stairway of perfection. Your arms, O Jesus, are the elevator that must raise me up even to Heaven. To reach You I need not grow; on the contrary, I must remain little, I must become more and more so." },
    { work: "Story of a Soul", text: "Miss no single opportunity of making some small sacrifice, here by a smiling look, there by a kindly word; always doing the smallest right and doing it all for love. Let us love, since our heart is made for nothing else. The Little Way is the way of spiritual childhood." },
    { work: "Story of a Soul", text: "I understand so well that it is only love which makes us acceptable to God, that this love is the only good I ambition. Jesus has no need of our works, but only of our love. How I wish I could make souls understand this, for it has given me such peace." },
    { work: "Story of a Soul", text: "What a grace it is to be convinced of one's own poverty and littleness. To remain little before God: this is the heart of it. I know now that true charity consists in bearing all our neighbors' defects — not being surprised at their weakness, but edified by their smallest virtues." },
    { work: "Last Conversations", text: "After my death, I will let fall a shower of roses. I will spend my heaven doing good upon earth. Do not weep, for I shall be more useful to you after my death, and I shall help you then more effectively than I do now." },
    { work: "Story of a Soul", text: "Love is repaid by love alone. Everything is grace. God would not give me this desire for Him if He did not mean to satisfy it. I choose all — I cannot be a saint by halves. I have never given God anything but love, and it is with love that He will repay." },
    { work: "Story of a Soul", text: "I have always wanted to be a saint, but when I compare myself to the saints I feel I am as far from them as a grain of sand from a mountain. Instead of being discouraged, I said to myself: God would not inspire desires that cannot be realised. My littleness is not an obstacle — it is the very condition of His mercy." },
    { work: "Letters to Céline", text: "Let us offer all our little sacrifices with love. Even the tiniest pinprick, offered with love, becomes a treasure. We are not great souls who can do great things — but we can love greatly in small things. It is not the greatness of the action but the love with which it is done that gives it worth before God." },
    { work: "Story of a Soul", text: "I have found my vocation at last — my vocation is love. In the heart of the Church, my Mother, I will be love. Thus I will be everything, and my dream will be realized. How can a soul so imperfect as mine aspire to love fully? Only by throwing itself into the arms of Jesus." },
    { work: "Last Conversations", text: "Do not be troubled when you feel nothing in prayer. Dryness is not absence — God is still present in the darkness. I myself have long periods of dryness in which I feel nothing. But feelings are not faith, and faith does not require feelings. It is enough to show up and remain." },
    { work: "Story of a Soul", text: "It seems to me that if a little bird tried to fly toward the sun, it would not first study favorable conditions. It would simply spread its wings. Our weakness does not hold us back from God — it is the very wing on which He lifts us. The weaker we are, the more He carries." },
    { work: "Story of a Soul", text: "To live by love is to go about sowing peace and joy in every heart. It means giving without counting the cost, with no thought of return. It is to follow Jesus who spent His whole life giving — from the manger to the cross. Love is repaid by love alone, and God's love is inexhaustible." }
  ]
};

// Call Google Gemini embeddings API (gemini-embedding-001)
async function getEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: {
        parts: [
          { text: text }
        ]
      },
      outputDimensionality: 768
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini Embedding API error: ${response.status} - ${JSON.stringify(errorData.error || errorData)}`);
  }

  const result = await response.json();
  if (!result.embedding || !result.embedding.values) {
    throw new Error(`Gemini Embedding API returned invalid response: ${JSON.stringify(result)}`);
  }
  return result.embedding.values;
}

// Insert chunked content and vector into Supabase
async function insertToSupabase(rows) {
  const sbHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/corpus`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase Insert error: ${response.status} - ${errorText}`);
  }
}

// Chunk large text
function chunkText(text, size = 300, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  if (words.length <= size) {
    return [text];
  }
  
  for (let i = 0; i < words.length; i += (size - overlap)) {
    const chunkWords = words.slice(i, i + size);
    if (chunkWords.length > 0) {
      chunks.push(chunkWords.join(' '));
    }
    if (i + size >= words.length) {
      break;
    }
  }
  return chunks;
}

// Main execution block
async function run() {
  const args = process.argv.slice(2);
  
  if (args.includes('--seed')) {
    console.log('Seeding Supabase corpus database with default 36 passages using Gemini gemini-embedding-001...');
    let totalSeeded = 0;
    
    for (const [doctor, passages] of Object.entries(SEED_PASSAGES)) {
      console.log(`Processing passages for doctor: ${doctor}...`);
      const rows = [];
      
      for (const p of passages) {
        try {
          const embedding = await getEmbedding(p.text);
          rows.push({
            doctor,
            work: p.work,
            content: p.text,
            embedding
          });
          totalSeeded++;
          console.log(`  Embedded passage: "${p.text.substring(0, 40)}..."`);
        } catch (err) {
          console.error(`  Error embedding passage: ${err.message}`);
        }
      }
      
      if (rows.length > 0) {
        await insertToSupabase(rows);
        console.log(`Uploaded ${rows.length} passages for ${doctor} to Supabase.`);
      }
    }
    console.log(`Success! Total passages seeded: ${totalSeeded}`);
    return;
  }

  // File ingestion mode
  if (args.length < 3) {
    console.log('Usage:');
    console.log('  1. Seed initial data:   node scripts/ingest.js --seed');
    console.log('  2. Ingest custom file:  node scripts/ingest.js <file_path> <doctor> <work> [chapter]');
    process.exit(1);
  }

  const [filePath, doctor, work, chapter] = args;
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  console.log(`Reading source file from ${filePath}...`);
  const rawText = fs.readFileSync(filePath, 'utf8').trim();
  const chunks = chunkText(rawText, 300, 50);
  
  console.log(`Chunked into ${chunks.length} segments (~300 words with 50-word overlap).`);
  
  const batchSize = 10;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}...`);
    
    const rows = [];
    for (const chunk of batch) {
      try {
        const embedding = await getEmbedding(chunk);
        rows.push({
          doctor,
          work,
          chapter: chapter || null,
          content: chunk,
          embedding
        });
      } catch (err) {
        console.error(`  Error embedding chunk: ${err.message}`);
      }
    }
    
    if (rows.length > 0) {
      await insertToSupabase(rows);
      console.log(`  Uploaded ${rows.length} chunks to Supabase.`);
    }
  }
  
  console.log('Finished ingesting file successfully!');
}

run().catch(err => {
  console.error('Fatal error running ingestion script:', err.message);
  process.exit(1);
});
