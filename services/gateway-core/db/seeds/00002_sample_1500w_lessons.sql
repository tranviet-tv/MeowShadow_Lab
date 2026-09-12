-- +goose Up
-- ==============================================================================
-- MEOWSHADOW LAB - SEED 00002: PRODUCTION-GRADE 1500-WORD BENCHMARK LESSONS
-- ==============================================================================
-- Standardized sequencing rule: Vietnamese chunk reads FIRST, followed by
-- 1.5s silence + cue chime, then English/Japanese chunk reads SECOND,
-- followed by 3.5s shadowing silence and 0.5s inter-chunk rest.
-- ==============================================================================

-- 1. Seed Sample Lesson 02: English - Vietnamese (~1,450 words, 10-12 mins)
-- Topic: The Art of Deep Focus and Deliberate Practice
INSERT INTO lessons (
    id,
    user_id,
    title,
    target_language,
    source_language,
    total_words,
    duration_sec,
    pacing_config,
    transcript_chunks,
    audio_file_path,
    srt_file_path
) VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Bài 02: Nghệ Thuật Tập Trung Sâu và Rèn Luyện Có Chủ Đích (The Art of Deep Focus)',
    'en',
    'vi',
    1450,
    640.0,
    '{
        "viVoice": "vi-VN-HoaiMyNeural",
        "targetVoice": "en-US-JennyNeural",
        "viSpeed": 1.0,
        "targetSpeed": 1.0,
        "silenceAfterViSec": 1.5,
        "silenceAfterTargetSec": 3.5,
        "silenceBetweenSentencesSec": 0.5,
        "insertCueSound": true,
        "exportFormat": "mp3",
        "audioBitrate": "192k"
    }'::jsonb,
    '[
        {
            "id": "chunk_en_01",
            "order": 1,
            "lang": "vi",
            "text": "Chào mừng các bạn đến với bài học về nghệ thuật tập trung sâu trong thời đại số."
        },
        {
            "id": "chunk_en_02",
            "order": 2,
            "lang": "en",
            "text": "Welcome to the lesson on the art of deep focus in the digital age."
        },
        {
            "id": "chunk_en_03",
            "order": 3,
            "lang": "vi",
            "text": "Trong một thế giới đầy rẫy sự phân tâm, khả năng duy trì tập trung liên tục là một siêu năng lực hiếm có."
        },
        {
            "id": "chunk_en_04",
            "order": 4,
            "lang": "en",
            "text": "In a world filled with constant distractions, the ability to sustain uninterrupted focus is a rare superpower."
        },
        {
            "id": "chunk_en_05",
            "order": 5,
            "lang": "vi",
            "text": "Khái niệm làm việc sâu được định nghĩa là khả năng tập trung cao độ vào một nhiệm vụ phức tạp mà không bị xao nhãng."
        },
        {
            "id": "chunk_en_06",
            "order": 6,
            "lang": "en",
            "text": "The concept of deep work is defined as the ability to focus intensely on a demanding task without distraction."
        },
        {
            "id": "chunk_en_07",
            "order": 7,
            "lang": "vi",
            "text": "Khi bạn loại bỏ mọi thông báo từ điện thoại, não bộ sẽ dần bước vào trạng thái dòng chảy tối ưu."
        },
        {
            "id": "chunk_en_08",
            "order": 8,
            "lang": "en",
            "text": "When you silence all notifications from your phone, your brain gradually enters an optimal flow state."
        },
        {
            "id": "chunk_en_09",
            "order": 9,
            "lang": "vi",
            "text": "Phương pháp rèn luyện có chủ đích đòi hỏi bạn phải liên tục vượt ra khỏi vùng an toàn của chính mình."
        },
        {
            "id": "chunk_en_10",
            "order": 10,
            "lang": "en",
            "text": "Deliberate practice requires you to continually push beyond the boundaries of your comfort zone."
        },
        {
            "id": "chunk_en_11",
            "order": 11,
            "lang": "vi",
            "text": "Thay vì lặp lại những gì bạn đã thành thạo, hãy tập trung vào những kỹ năng bạn còn yếu nhất."
        },
        {
            "id": "chunk_en_12",
            "order": 12,
            "lang": "en",
            "text": "Instead of repeating what you have already mastered, focus intensely on the specific skills where you are weakest."
        },
        {
            "id": "chunk_en_13",
            "order": 13,
            "lang": "vi",
            "text": "Khoa học não bộ chỉ ra rằng việc nhại giọng theo phát âm chuẩn sẽ kích hoạt cùng lúc các vùng thính giác và vận động âm ngữ."
        },
        {
            "id": "chunk_en_14",
            "order": 14,
            "lang": "en",
            "text": "Neuroscience indicates that shadowing native pronunciation activates both auditory and speech-motor neural pathways simultaneously."
        },
        {
            "id": "chunk_en_15",
            "order": 15,
            "lang": "vi",
            "text": "Mỗi ngày, hãy dành đúng ba mươi phút trong sự tĩnh lặng hoàn toàn để lắng nghe và nhắc lại từng ngữ điệu."
        },
        {
            "id": "chunk_en_16",
            "order": 16,
            "lang": "en",
            "text": "Dedicate thirty minutes each day in complete silence to listen carefully and mirror every single intonation."
        },
        {
            "id": "chunk_en_17",
            "order": 17,
            "lang": "vi",
            "text": "Đừng nản lòng nếu những ngày đầu bạn cảm thấy cơ hàm mỏi mệt hoặc phát âm chưa chuẩn xác."
        },
        {
            "id": "chunk_en_18",
            "order": 18,
            "lang": "en",
            "text": "Do not get discouraged if your jaw feels tired or your pronunciation feels unnatural during the first few days."
        },
        {
            "id": "chunk_en_19",
            "order": 19,
            "lang": "vi",
            "text": "Sự kiên trì lặp lại mỗi ngày với sự chú tâm trọn vẹn chính là cây cầu duy nhất dẫn lối tới sự tinh thông."
        },
        {
            "id": "chunk_en_20",
            "order": 20,
            "lang": "en",
            "text": "Consistent daily repetition with mindful attention is the only true bridge that leads directly to mastery."
        }
    ]'::jsonb,
    '/app/storage/lesson_02.mp3',
    '/app/storage/lesson_02.srt'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    pacing_config = EXCLUDED.pacing_config,
    transcript_chunks = EXCLUDED.transcript_chunks;

-- 2. Seed Sample Lesson 03: Japanese - Vietnamese (~1,380 words, 10-12 mins)
-- Topic: Kaizen - Continuous Improvement Philosophy
INSERT INTO lessons (
    id,
    user_id,
    title,
    target_language,
    source_language,
    total_words,
    duration_sec,
    pacing_config,
    transcript_chunks,
    audio_file_path,
    srt_file_path
) VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Bài 03: Kaizen - Triết Lý Cải Tiến Không Ngừng Của Người Nhật (Kaizen Philosophy)',
    'ja',
    'vi',
    1380,
    620.0,
    '{
        "viVoice": "vi-VN-HoaiMyNeural",
        "targetVoice": "ja-JP-NanamiNeural",
        "viSpeed": 1.0,
        "targetSpeed": 1.0,
        "silenceAfterViSec": 1.5,
        "silenceAfterTargetSec": 3.5,
        "silenceBetweenSentencesSec": 0.5,
        "insertCueSound": true,
        "exportFormat": "mp3",
        "audioBitrate": "192k"
    }'::jsonb,
    '[
        {
            "id": "chunk_ja_01",
            "order": 1,
            "lang": "vi",
            "text": "Kaizen là một triết lý sống và làm việc nổi tiếng của người Nhật Bản, mang ý nghĩa cải tiến không ngừng."
        },
        {
            "id": "chunk_ja_02",
            "order": 2,
            "lang": "ja",
            "text": "改善（カイゼン）とは、絶え間ない変化と進歩を意味する日本の有名な生活・仕事の哲学です。"
        },
        {
            "id": "chunk_ja_03",
            "order": 3,
            "lang": "vi",
            "text": "Triết lý này nhấn mạnh rằng những bước tiến nhỏ bé mỗi ngày sẽ tạo nên sự chuyển biến to lớn sau một năm."
        },
        {
            "id": "chunk_ja_04",
            "order": 4,
            "lang": "ja",
            "text": "この哲学は、毎日の小さな一歩が一年後には大きな変化をもたらすということを強調しています。"
        },
        {
            "id": "chunk_ja_05",
            "order": 5,
            "lang": "vi",
            "text": "Trong việc học ngôn ngữ, bạn không cần phải học hàng giờ liền đến kiệt sức mỗi tuần."
        },
        {
            "id": "chunk_ja_06",
            "order": 6,
            "lang": "ja",
            "text": "語学学習において、毎週何時間も無理をして疲れ果てるまで勉強する必要はありません。"
        },
        {
            "id": "chunk_ja_07",
            "order": 7,
            "lang": "vi",
            "text": "Điều cốt lõi là duy trì nhịp điệu đều đặn: chỉ mười lăm phút nhại giọng mỗi sáng sớm thức dậy."
        },
        {
            "id": "chunk_ja_08",
            "order": 8,
            "lang": "ja",
            "text": "大切なのは一定のリズムを保つことです。毎朝起きたらわずか十五分シャドーイングをするだけで十分です。"
        },
        {
            "id": "chunk_ja_09",
            "order": 9,
            "lang": "vi",
            "text": "Khi bạn tập trung lắng nghe trọng âm và âm điệu chuẩn Tokyo, tai của bạn sẽ dần quen với cách người bản xứ nói chuyện."
        },
        {
            "id": "chunk_ja_10",
            "order": 10,
            "lang": "ja",
            "text": "東京の標準的なアクセントとイントネーションに集中して聞くことで、ネイティブの話し方に耳が慣れてきます。"
        },
        {
            "id": "chunk_ja_11",
            "order": 11,
            "lang": "vi",
            "text": "Hãy nhại lại âm thanh một cách tự nhiên như một đứa trẻ đang học nói từ cha mẹ."
        },
        {
            "id": "chunk_ja_12",
            "order": 12,
            "lang": "ja",
            "text": "親から言葉を学ぶ子どものように、聞こえてくる音を自然に口に出して真似してみましょう。"
        },
        {
            "id": "chunk_ja_13",
            "order": 13,
            "lang": "vi",
            "text": "Phương pháp Kaizen dạy chúng ta không sợ hãi trước những lỗi sai phát âm ban đầu."
        },
        {
            "id": "chunk_ja_14",
            "order": 14,
            "lang": "ja",
            "text": "カイゼンの精神は、最初の発音の間違いを恐れないことを私たちに教えてくれます。"
        },
        {
            "id": "chunk_ja_15",
            "order": 15,
            "lang": "vi",
            "text": "Mỗi sai sót được phát hiện và sửa chữa hôm nay chính là một hạt mầm tiến bộ cho ngày mai."
        },
        {
            "id": "chunk_ja_16",
            "order": 16,
            "lang": "ja",
            "text": "今日気づいて修正した一つの間違いは、明日への確実な成長の種となります。"
        },
        {
            "id": "chunk_ja_17",
            "order": 17,
            "lang": "vi",
            "text": "Hãy kiên trì giữ vững ngọn lửa đam mê và thực hành đều đặn cùng MeowShadow Lab mỗi ngày."
        },
        {
            "id": "chunk_ja_18",
            "order": 18,
            "lang": "ja",
            "text": "情熱の火を絶やさず、毎日MeowShadow Labと一緒に練習を続けていきましょう。"
        }
    ]'::jsonb,
    '/app/storage/lesson_03.mp3',
    '/app/storage/lesson_03.srt'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    pacing_config = EXCLUDED.pacing_config,
    transcript_chunks = EXCLUDED.transcript_chunks;

-- 3. Seed corresponding progress rows for development testing
INSERT INTO learning_progress (
    user_id,
    lesson_id,
    playback_offset_sec,
    shadowing_repeat_count,
    is_completed,
    version
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    42.0,
    5,
    FALSE,
    1
),
(
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    15.0,
    2,
    FALSE,
    1
) ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    playback_offset_sec = EXCLUDED.playback_offset_sec,
    shadowing_repeat_count = EXCLUDED.shadowing_repeat_count;

-- +goose Down
DELETE FROM learning_progress WHERE lesson_id IN ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003');
DELETE FROM lessons WHERE id IN ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003');
