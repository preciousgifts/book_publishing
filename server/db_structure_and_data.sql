-- Database Schema and Data Dump
-- Generated on: 2026-08-01T01:33:40.345Z

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "securityQuestion" TEXT,
    "securityAnswerHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "languageLocale" TEXT NOT NULL DEFAULT 'en-US',
    "trimSize" TEXT NOT NULL DEFAULT '6x9',
    "status" TEXT NOT NULL DEFAULT 'outline_pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Outline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tocData" JSONB NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "discoveryAnswers" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "Outline_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Outline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Paragraph" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chapterIndex" INTEGER NOT NULL,
    "paragraphIndex" INTEGER NOT NULL,
    "rawContent" TEXT NOT NULL,
    "formattedHtml" TEXT NOT NULL,
    "statusFlags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Paragraph_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Paragraph_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "UserProgress" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "activeChapterIndex" INTEGER NOT NULL DEFAULT 0,
    "activeParagraphIndex" INTEGER NOT NULL DEFAULT 0,
    "playbackSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "selectedVoice" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserProgress_projectId_key" ON "UserProgress"("projectId");

-- 2. Insert Data

-- Data for table "User"
INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "securityQuestion", "securityAnswerHash", "createdAt", "updatedAt") VALUES ('ed51065b-474e-4270-a2a2-5f0ac42b02e8', 'test_user_1785543981699@example.com', '$2a$10$WQXJhS1Vi1HHFVPfBK2dBOdjdVD1efdXHn2PIk/Nbzs30it7Hi8/6', 'Test User', NULL, NULL, '2026-08-01T00:26:24.178Z', '2026-08-01T00:26:24.178Z') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "securityQuestion", "securityAnswerHash", "createdAt", "updatedAt") VALUES ('f5405b01-d862-43b9-94f5-fe5cbd0fb4b0', 'test_user_proj_1785546931546@example.com', '$2a$10$hWcrxBkI2wO1RC9MuutTXOrY9Bgyo0zb/7VyMcZUixSsM2Ct0TErO', 'Project Tester', NULL, NULL, '2026-08-01T01:15:36.247Z', '2026-08-01T01:15:36.247Z') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "securityQuestion", "securityAnswerHash", "createdAt", "updatedAt") VALUES ('495bde5b-211a-49ef-ab74-010696a8074a', 'obabiyiolusayo@gmail.com', '$2a$10$15Goi6dh4kg0jY3k5tEWj.SEDix0NBTuEwNT78y/yZJHAlkO7SCiy', 'Olusayo Paul', NULL, NULL, '2026-08-01T00:27:12.793Z', '2026-08-01T01:28:43.894Z') ON CONFLICT ("id") DO NOTHING;

-- Data for table "Project"
INSERT INTO "Project" ("id", "userId", "title", "genre", "languageLocale", "trimSize", "status", "createdAt", "updatedAt") VALUES ('fd6a1235-e1e5-4a88-83cb-83df154d2121', '495bde5b-211a-49ef-ab74-010696a8074a', 'becoming victorious in christ', 'non-fiction', 'en-US', '6x9', 'in_progress', '2026-08-01T00:29:59.099Z', '2026-08-01T00:48:25.877Z') ON CONFLICT ("id") DO NOTHING;

-- Data for table "Outline"
INSERT INTO "Outline" ("id", "projectId", "tocData", "approved", "discoveryAnswers") VALUES ('f381f577-e254-4742-a7f5-6932bea3b299', 'fd6a1235-e1e5-4a88-83cb-83df154d2121', '{"toc":[{"title":"Defining Victory: More Than Just Winning","summary":"This chapter introduces the concept of ''victory in Christ,'' distinguishing it from worldly success and establishing a biblical foundation for what true spiritual victory entails, rooted in Jesus'' finished work.","subtopics":["The World''s View vs. God''s View of Victory","Christ''s Victory: The Cornerstone of Ours","Understanding Our Position in Christ","The Purpose of Our Victory"],"chapterNumber":1},{"title":"The Unwavering Anchor: Who Jesus Christ Is","summary":"Explores the person and nature of Jesus Christ – His deity, humanity, sacrifice, resurrection, and present reign – as the central focus and source of all Christian victory.","subtopics":["Jesus: Fully God, Fully Man","The Significance of His Atonement","His Resurrection: Our Assurance of Life","Christ Our Intercessor and King"],"chapterNumber":2},{"title":"Shifting Our Gaze: The Call to Christ-Centered Focus","summary":"Addresses the common distractions and idols that pull Christians away from Christ, emphasizing the transformative power and peace found in continually fixing our eyes on Him.","subtopics":["Identifying Modern-Day Idols and Distractions","The Command to ''Look Unto Jesus''","Benefits of a Christ-Centered Life","The Danger of Self-Focus vs. Christ-Focus"],"chapterNumber":3},{"title":"Overcoming the Obstacles: Warfare and Temptation","summary":"Provides practical and spiritual strategies for Christians to overcome common struggles like doubt, fear, sin, and spiritual attacks by leveraging the power and authority given to them in Christ.","subtopics":["Understanding Our Enemy''s Tactics","The Armor of God: Christ Our Defense","Conquering Temptation Through Christ''s Strength","Finding Freedom from Guilt and Shame"],"chapterNumber":4},{"title":"Daily Disciplines of a Victorious Life","summary":"Outlines essential spiritual disciplines – prayer, Bible study, worship, and fellowship – as practical means by which believers can strengthen their focus on Christ and walk in consistent victory.","subtopics":["The Power of Consistent Prayer","Feasting on God''s Word: Illumination and Guidance","Worship as an Act of Spiritual Warfare","The Vital Role of Christian Community"],"chapterNumber":5},{"title":"Empowered by His Spirit: Living in Grace and Power","summary":"Explores the role of the Holy Spirit in enabling believers to live victoriously, emphasizing reliance on His power rather than self-effort, and understanding the abundance of God''s grace.","subtopics":["The Holy Spirit: Our Helper and Guide","Walking in the Spirit vs. Walking in the Flesh","Embracing God''s Unmerited Favor (Grace)","Operating in Spiritual Gifts for God''s Glory"],"chapterNumber":6},{"title":"The Victorious Mindset: Renewing Your Thoughts in Christ","summary":"Focuses on the transformation of the mind, teaching readers how to align their thoughts, beliefs, and attitudes with God''s truth, fostering a mindset of victory and peace.","subtopics":["Taking Every Thought Captive","Identity in Christ: Who God Says You Are","Cultivating Gratitude and Joy","Developing a Kingdom Perspective"],"chapterNumber":7},{"title":"Walking Out Victory: Impacting Your World","summary":"Challenges believers to extend their personal victory into their spheres of influence, living as ambassadors of Christ and demonstrating His love and power in their daily lives, work, and relationships.","subtopics":["Living as an Ambassador of Christ","Shining Christ''s Light in Your Sphere of Influence","Serving Others with a Victorious Heart","Sharing the Good News of Christ''s Victory"],"chapterNumber":8},{"title":"Sustaining the Journey: Perseverance and Future Hope","summary":"Encourages readers in the long-term journey of faith, emphasizing the importance of perseverance, looking forward to Christ''s return, and the ultimate, eternal victory guaranteed to those in Him.","subtopics":["Running the Race with Endurance","Finding Strength in Times of Waiting","The Blessed Hope: Christ''s Return","Our Eternal Inheritance and Ultimate Victory"],"chapterNumber":9}],"discoveryQuestions":["What specific struggles or challenges do you anticipate your target Christian audience is currently facing that this book should directly address?","Will the tone be more devotional and reflective, or practical and action-oriented, or a blend of both?","How deeply should the book delve into theological concepts versus focusing on everyday application and encouragement?","Are there any particular biblical figures or stories of victory (besides Jesus himself) that you would like to emphasize or draw lessons from?","What is the desired emotional impact you want readers to experience by the end of the book (e.g., empowered, comforted, challenged, transformed)?"]}'::jsonb, true, '{"Will the tone be more devotional and reflective, or practical and action-oriented, or a blend of both?":"a blend of both","How deeply should the book delve into theological concepts versus focusing on everyday application and encouragement?":"moderate but highly practical","Are there any particular biblical figures or stories of victory (besides Jesus himself) that you would like to emphasize or draw lessons from?":"Joseph, David, Daniel, Elijah, Mary (mother of Jesus)","What is the desired emotional impact you want readers to experience by the end of the book (e.g., empowered, comforted, challenged, transformed)?":"Empowered, comforted, transformed","What specific struggles or challenges do you anticipate your target Christian audience is currently facing that this book should directly address?":"coping with life challenges can be difficult at times. we need something that will keep us going"}'::jsonb) ON CONFLICT ("id") DO NOTHING;

-- Data for table "UserProgress"
INSERT INTO "UserProgress" ("id", "projectId", "activeChapterIndex", "activeParagraphIndex", "playbackSpeed", "selectedVoice") VALUES ('9935479a-ca61-462a-b311-8c1ac6c05fde', 'fd6a1235-e1e5-4a88-83cb-83df154d2121', 0, 0, 1, '') ON CONFLICT ("id") DO NOTHING;
