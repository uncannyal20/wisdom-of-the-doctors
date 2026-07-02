import os
import sys
import json
import urllib.request
import urllib.error

# Basic dotenv parser to read .env file locally without external dependencies
def load_env():
    try:
        env_path = os.path.join(os.path.dirname(__file__), '../.env')
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    parts = line.split('=', 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip().strip('"').strip("'")
                        if key and not os.environ.get(key):
                            os.environ[key] = val
            print('Loaded environment variables from .env')
    except Exception as e:
        print(f'Warning: Could not read .env file: {str(e)}')

load_env()

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not GEMINI_API_KEY:
    print('ERROR: Missing required environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY) in .env.')
    sys.exit(1)

# Default 36 passages from wisdom-of-the-doctors.html
SEED_PASSAGES = {
  "sales": [
    { "work": "Introduction to the Devout Life", "text": "Ask God to give you a great desire to please Him, and be sure that your desires themselves are a form of prayer. Be patient with everyone, but above all with yourself. I mean that you should not be discouraged by your imperfections, but always rise with fresh courage." },
    { "work": "Introduction to the Devout Life", "text": "Devout life is not to be separated from ordinary life. Do not wish to be anything but what you are, and try to be that perfectly. The same God who cares for you in one state also cares for you in another. Do not look forward in fear to what might come; the same everlasting Father who cares for you today will take care of you tomorrow." },
    { "work": "Introduction to the Devout Life", "text": "Do not lose your inward peace for anything whatsoever, even if your whole world seems upset. What is the use of being troubled? The ship is safer that is tempest-tossed but has a skilled pilot than one in calm waters with no one at the helm." },
    { "work": "The Love of God", "text": "The measure of love is to love without measure. True love is always accompanied by gentleness. We must all bear one another's burdens, for that is the law of Christ. Be who you are and be that well, so as to do honour to the Master Craftsman whose handiwork you are." },
    { "work": "Consoling Thoughts", "text": "The person who has peace in his conscience does not trouble himself as to what the world says of him. Let the world talk as much as it pleases, since God sees our heart. Have no anxiety for the future, but be busy now with the present." },
    { "work": "The Love of God", "text": "The will of God is the very definition of goodness itself. Nothing happens by chance with God, nothing by caprice. When you do not know what to do, simply hold still and wait on the Lord; your doubts will clear, your path will open." },
    { "work": "Introduction to the Devout Life", "text": "Nothing so effectually mortifies the heart as humility, and nothing so destroys it as pride. When we are angry with ourselves at our faults, it is often not because they offended God but because they embarrassed us. True humility is gentle toward oneself — and that gentleness is where all gentleness toward others is born." },
    { "work": "Letters of Spiritual Direction", "text": "Do not look forward to what may happen tomorrow. The same everlasting Father who cares for you today will take care of you tomorrow and every day. Either He will shield you from suffering or He will give you unfailing strength to bear it. Be at peace, and put aside all anxious thoughts." },
    { "work": "The Love of God", "text": "The soul truly united to God finds all things easy, because she does them through love. When we do small things through love they become great before God. The heart that loves is like a mother who never tires of her child; love makes every burden light and every path straight." },
    { "work": "Introduction to the Devout Life", "text": "Choose friends who are good, virtuous, and truthful. The friendship of virtue is never broken except by sin, and it grows stronger with each passing day. Do not multiply friendships; a few deep and holy bonds are worth more than many shallow ones. Those who travel together toward God travel well." },
    { "work": "Consoling Thoughts", "text": "Death is nothing to fear for one who has lived in God's love. It is the final surrender, the last act of trust. All our life has been a preparation for this moment of meeting. Those who die in God are not lost — they are gathered like late roses into an eternal garden." },
    { "work": "The Love of God", "text": "Holy indifference is not coldness; it is the warmth of a will perfectly free to follow God wherever He leads. The surrendered soul says not merely 'Thy will be done' as resignation, but as joy — for they have learned that God's will is always mercy dressed as circumstance." }
  ],
  "augustine": [
    { "work": "Confessions", "text": "Thou madest us for Thyself, and our heart is restless until it repose in Thee. Our heart is restless, O Lord, until it finds rest in You. You have made us for yourself, and our heart is troubled until it rests in You." },
    { "work": "Confessions", "text": "Late have I loved Thee, O Beauty so ancient and so new, late have I loved Thee! For behold Thou wert within me, and I without, and I was seeking Thee without. Thou wert with me, and I was not with Thee." },
    { "work": "Confessions", "text": "Thou awakest us to delight in Thy praise; for Thou madest us for Thyself. Grant me, Lord, to know and understand which is first, to call on Thee or to praise Thee. Do Thou awaken us, and call us back, inflame us and carry us upward." },
    { "work": "City of God", "text": "Our heart is made for Thee, O Lord, and it will not rest until it rests in Thee. The soul of man is by its very nature capable of receiving the gift of God. Even in our sins, we are searching for God under wrong names and in wrong places." },
    { "work": "Sermons on the Psalms", "text": "God loves each of us as if there were only one of us. Hope has two beautiful daughters: anger and courage. Anger at the way things are, and courage to work to change them. Do not despair; many people have been saved who have come to God late." },
    { "work": "Confessions", "text": "The punishment of sin is sin, and the reward of virtue is virtue. Lord, make me pure — but not yet! is the prayer of those who are not yet ready to surrender. But what joy it is when we finally let go and allow God to be God in our lives." },
    { "work": "Confessions", "text": "Thou wert calling and crying aloud to me, shattering my deafness. Thou wert gleaming and glowing, and dispelling my blindness. You were fragrant, and I drew in breath — and now I pant after Thee. I tasted, and now I hunger and thirst. You touched me, and I burned for Thy peace." },
    { "work": "On Christian Doctrine", "text": "You have commanded us to love God and neighbor, and in these two all the Law is summed. Love, and do what you will: if you hold your peace, hold it through love; if you cry out, cry out through love; if you correct, correct through love. Let love be the root within you — from this root nothing but good can spring." },
    { "work": "Sermons on the Psalms", "text": "Sing to the Lord a new song — and this new song is the song of love. Whoever has learned to love, sings. But the old person, still captive to sin, cannot sing what is new. You must first be made new, and then you will sing what is new. The life of praise is the life of love." },
    { "work": "Confessions", "text": "I have learnt to love Thee late, Thou Beauty ever old and ever new. What held me far from Thee was I myself, and I myself kept myself from Thee. There is a joy which is given not to the wicked, but to those who worship Thee for Thine own sake — and Thyself art that joy." },
    { "work": "City of God", "text": "Two cities have been formed by two loves: the earthly by love of self to the contempt of God, the heavenly by love of God to the contempt of self. The one glories in itself, the other in the Lord. The one seeks glory from men; the other finds its highest glory in God, the witness of conscience." },
    { "work": "Sermons", "text": "Do not lose heart because of your sins. Even if you have sinned greatly, do not despair. I do not say to you: do not sin any more — we are all sinners. I say: do not despair. The remedy for sin is not despair but repentance, and God is always ready to receive the one who turns back." }
  ],
  "therese": [
    { "work": "Story of a Soul", "text": "I want to find an elevator to raise me to Jesus, for I am too small to climb the rough stairway of perfection. Your arms, O Jesus, are the elevator that must raise me up even to Heaven. To reach You I need not grow; on the contrary, I must remain little, I must become more and more so." },
    { "work": "Story of a Soul", "text": "Miss no single opportunity of making some small sacrifice, here by a smiling look, there by a kindly word; always doing the smallest right and doing it all for love. Let us love, since our heart is made for nothing else. The Little Way is the way of spiritual childhood." },
    { "work": "Story of a Soul", "text": "I understand so well that it is only love which makes us acceptable to God, that this love is the only good I ambition. Jesus has no need of our works, but only of our love. How I wish I could make souls understand this, for it has given me such peace." },
    { "work": "Story of a Soul", "text": "What a grace it is to be convinced of one's own poverty and littleness. To remain little before God: this is the heart of it. I know now that true charity consists in bearing all our neighbors' defects — not being surprised at their weakness, but edified by their smallest virtues." },
    { "work": "Last Conversations", "text": "After my death, I will let fall a shower of roses. I will spend my heaven doing good upon earth. Do not weep, for I shall be more useful to you after my death, and I shall help you then more effectively than I do now." },
    { "work": "Story of a Soul", "text": "Love is repaid by love alone. Everything is grace. God would not give me this desire for Him if He did not mean to satisfy it. I choose all — I cannot be a saint by halves. I have never given God anything but love, and it is with love that He will repay." },
    { "work": "Story of a Soul", "text": "I have always wanted to be a saint, but when I compare myself to the saints I feel I am as far from them as a grain of sand from a mountain. Instead of being discouraged, I said to myself: God would not inspire desires that cannot be realised. My littleness is not an obstacle — it is the very condition of His mercy." },
    { "work": "Letters to Céline", "text": "Let us offer all our little sacrifices with love. Even the tiniest pinprick, offered with love, becomes a treasure. We are not great souls who can do great things — but we can love greatly in small things. It is not the greatness of the action but the love with which it is done that gives it worth before God." },
    { "work": "Story of a Soul", "text": "I have found my vocation at last — my vocation is love. In the heart of the Church, my Mother, I will be love. Thus I will be everything, and my dream will be realized. How can a soul so imperfect as mine aspire to love fully? Only by throwing itself into the arms of Jesus." },
    { "work": "Last Conversations", "text": "Do not be troubled when you feel nothing in prayer. Dryness is not absence — God is still present in the darkness. I myself have long periods of dryness in which I feel nothing. But feelings are not faith, and faith does not require feelings. It is enough to show up and remain." },
    { "work": "Story of a Soul", "text": "It seems to me that if a little bird tried to fly toward the sun, it would not first study favorable conditions. It would simply spread its wings. Our weakness does not hold us back from God — it is the very wing on which He lifts us. The weaker we are, the more He carries." },
    { "work": "Story of a Soul", "text": "To live by love is to go about sowing peace and joy in every heart. It means giving without counting the cost, with no thought of return. It is to follow Jesus who spent His whole life giving — from the manger to the cross. Love is repaid by love alone, and God's love is inexhaustible." }
  ]
}

# Call Google Gemini embeddings API (gemini-embedding-001)
def get_embedding(text):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {
            "parts": [
                { "text": text }
            ]
        },
        "outputDimensionality": 768
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode('utf-8'))
            if 'embedding' not in res_data or 'values' not in res_data['embedding']:
                raise Exception(f"Unexpected response structure: {res_data}")
            return res_data['embedding']['values']
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        raise Exception(f"Gemini API error: {e.code} - {err_body}")

# Insert chunked content and vector into Supabase
def insert_to_supabase(rows):
    url = f"{SUPABASE_URL}/rest/v1/corpus"
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f"Bearer {SUPABASE_ANON_KEY}",
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(rows).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            pass
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        raise Exception(f"Supabase Insert error: {e.code} - {err_body}")

# Chunk large text
def chunk_text(text, size=300, overlap=50):
    words = text.split()
    chunks = []
    
    if len(words) <= size:
        return [text]
        
    i = 0
    while i < len(words):
        chunk_words = words[i:i+size]
        if chunk_words:
            chunks.append(" ".join(chunk_words))
        if i + size >= len(words):
            break
        i += (size - overlap)
        
    return chunks

def main():
    args = sys.argv[1:]
    
    if '--seed' in args:
        print('Seeding Supabase corpus database with default 36 passages using Gemini gemini-embedding-001...')
        total_seeded = 0
        
        for doctor, passages in SEED_PASSAGES.items():
            print(f"Processing passages for doctor: {doctor}...")
            rows = []
            
            for p in passages:
                try:
                    embedding = get_embedding(p['text'])
                    rows.append({
                        "doctor": doctor,
                        "work": p['work'],
                        "content": p['text'],
                        "embedding": embedding
                    })
                    total_seeded += 1
                    print(f"  Embedded passage: \"{p['text'][:40]}...\"")
                except Exception as err:
                    print(f"  Error embedding passage: {str(err)}")
            
            if rows:
                insert_to_supabase(rows)
                print(f"Uploaded {len(rows)} passages for {doctor} to Supabase.")
                
        print(f"Success! Total passages seeded: {total_seeded}")
        return

    # File ingestion mode
    if len(args) < 3:
        print('Usage:')
        print('  1. Seed initial data:   python3 scripts/ingest.py --seed')
        print('  2. Ingest custom file:  python3 scripts/ingest.py <file_path> <doctor> <work> [chapter]')
        sys.exit(1)

    file_path, doctor, work = args[:3]
    chapter = args[3] if len(args) > 3 else None
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        sys.exit(1)

    print(f"Reading source file from {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        raw_text = f.read().strip()
        
    chunks = chunk_text(raw_text, 300, 50)
    print(f"Chunked into {len(chunks)} segments (~300 words with 50-word overlap).")
    
    batch_size = 10
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{((len(chunks)-1)//batch_size) + 1}...")
        
        rows = []
        for chunk in batch:
            try:
                embedding = get_embedding(chunk)
                rows.append({
                    "doctor": doctor,
                    "work": work,
                    "chapter": chapter,
                    "content": chunk,
                    "embedding": embedding
                })
            except Exception as err:
                print(f"  Error embedding chunk: {str(err)}")
                
        if rows:
            insert_to_supabase(rows)
            print(f"  Uploaded {len(rows)} chunks to Supabase.")
            
    print('Finished ingesting file successfully!')

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Fatal error running ingestion script: {str(e)}")
        sys.exit(1)
