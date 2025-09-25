// Demo: Non-Technical Curriculum System
// Demonstrates competitive intelligence-powered persona generation

import type {
  InterviewerPersona,
  StandardQuestion,
  CandidatePrep
} from './lib/agents/curriculum/nodes/persona-generation';

// Simulate the system output for Netflix Tax Analyst role
function demoNetflixCurriculumSystem() {
  console.log('🎬 DEMO: Netflix Tax Analyst Non-Technical Interview Curriculum');
  console.log('=' .repeat(70));

  // Simulated competitive intelligence (from our research phase)
  const competitiveIntelligence = {
    primaryCompetitors: ['Disney+', 'Amazon Prime Video', 'HBO Max'],
    roleComparison: 'Netflix Tax Analyst manages 190+ countries vs Disney 100+ countries',
    strategicAdvantages: [
      '$15B content investment vs Disney $8B creates unique transfer pricing challenges',
      'Global-first strategy requires complex international tax compliance',
      'Ad-tier launch in EMEA demands new regulatory frameworks'
    ],
    recentDevelopments: [
      'Password sharing crackdown increased revenue complexity across regions',
      'Gaming expansion creating new revenue streams requiring tax analysis',
      'Live sports content acquisition changing content classification'
    ],
    competitivePositioning: 'Netflix leads in global content investment but faces higher regulatory complexity than traditional media companies'
  };

  console.log('🧠 Competitive Intelligence Generated:');
  console.log(`   Strategic Advantages: ${competitiveIntelligence.strategicAdvantages.length}`);
  console.log(`   Recent Developments: ${competitiveIntelligence.recentDevelopments.length}`);
  console.log('   ✅ Data ready for persona generation\n');

  // Demonstrate the 5 generated personas
  const generatedPersonas: InterviewerPersona[] = [
    {
      id: 'recruiter_screen-1',
      round_number: 1,
      round_type: 'recruiter_screen',
      identity: {
        name: 'Sarah Chen',
        role: 'Global Talent Recruiter at Netflix',
        tenure_years: 3,
        personality_traits: ['friendly', 'thorough', 'globally-minded']
      },
      knowledge_base: {
        strategic_advantages: ['$15B content investment', 'Global-first strategy'],
        recent_developments: ['Password sharing crackdown', 'Gaming expansion'],
        competitive_context: 'Netflix operates in 190+ countries vs Disney 100+ countries, creating unique tax complexity'
      }
    },
    {
      id: 'behavioral_deep_dive-2',
      round_number: 2,
      round_type: 'behavioral_deep_dive',
      identity: {
        name: 'Michael Rodriguez',
        role: 'Senior Tax Manager at Netflix',
        tenure_years: 5,
        personality_traits: ['analytical', 'detail-oriented', 'experienced']
      },
      knowledge_base: {
        strategic_advantages: ['$15B content investment', 'Ad-tier complexity'],
        recent_developments: ['Gaming expansion', 'Live sports content'],
        competitive_context: 'Netflix faces higher regulatory complexity than traditional media companies'
      }
    },
    {
      id: 'culture_values_alignment-3',
      round_number: 3,
      round_type: 'culture_values_alignment',
      identity: {
        name: 'Emma Thompson',
        role: 'Director of International Tax at Netflix',
        tenure_years: 4,
        personality_traits: ['values-driven', 'collaborative', 'strategic']
      },
      knowledge_base: {
        strategic_advantages: ['Global-first strategy', 'Complex international compliance'],
        recent_developments: ['Ad-tier launch in EMEA', 'Password sharing crackdown'],
        competitive_context: 'Netflix leads in global content investment requiring sophisticated tax strategy'
      }
    },
    {
      id: 'strategic_role_discussion-4',
      round_number: 4,
      round_type: 'strategic_role_discussion',
      identity: {
        name: 'David Kim',
        role: 'VP of Finance at Netflix',
        tenure_years: 6,
        personality_traits: ['strategic', 'business-focused', 'forward-thinking']
      },
      knowledge_base: {
        strategic_advantages: ['$15B content investment', 'Global regulatory expertise'],
        recent_developments: ['Gaming expansion', 'Live sports acquisition'],
        competitive_context: 'Netflix unique position with global content investment creates fascinating tax challenges'
      }
    },
    {
      id: 'executive_final-5',
      round_number: 5,
      round_type: 'executive_final',
      identity: {
        name: 'Lisa Johnson',
        role: 'Chief Financial Officer at Netflix',
        tenure_years: 8,
        personality_traits: ['visionary', 'decisive', 'leadership-focused']
      },
      knowledge_base: {
        strategic_advantages: ['Global content leadership', 'Complex multi-market operations'],
        recent_developments: ['Strategic expansion into gaming and sports'],
        competitive_context: 'Netflix operating model fundamentally different from traditional media requiring innovative tax approaches'
      }
    }
  ];

  console.log('🎭 Generated 5 Dynamic Personas:');
  generatedPersonas.forEach(persona => {
    console.log(`   Round ${persona.round_number}: ${persona.identity.name}`);
    console.log(`      Role: ${persona.identity.role}`);
    console.log(`      Knows: ${persona.knowledge_base.strategic_advantages[0]}`);
    console.log(`      Context: ${persona.knowledge_base.competitive_context.slice(0, 80)}...`);
    console.log('');
  });

  // Demonstrate standard questions with CI integration
  const sampleQuestions: Record<string, StandardQuestion[]> = {
    recruiter_screen: [
      {
        id: 'rs-q1',
        text: 'Why are you interested in working at Netflix?',
        category: 'motivation',
        follow_ups: ['What specifically interests you about our global operations?', 'How do you see yourself contributing to our international expansion?'],
        time_allocation_minutes: 5
      },
      {
        id: 'rs-q2',
        text: 'What do you know about Netflix as a company?',
        category: 'motivation',
        follow_ups: ['What aspects of our business model intrigue you most?', 'How do you think our content strategy affects operations?'],
        time_allocation_minutes: 4
      }
    ]
  };

  console.log('❓ Sample Standard Questions (Recruiter Screen):');
  sampleQuestions.recruiter_screen.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q.text}`);
    console.log(`      Follow-ups: ${q.follow_ups.length} prepared`);
  });
  console.log('');

  // Demonstrate candidate prep with CI talking points
  const samplePrepGuide: CandidatePrep = {
    ci_talking_points: {
      strategic_advantages: [
        {
          advantage: '$15B content investment vs Disney $8B creates unique transfer pricing challenges',
          how_to_weave_in: 'Reference when discussing interest in complex international tax work',
          example_response: 'I\'m excited about Netflix\'s unique position with $15B in content investment across 190+ countries, which creates fascinating transfer pricing challenges that traditional media companies don\'t face at this scale.'
        },
        {
          advantage: 'Global-first strategy vs competitors regional approach',
          how_to_weave_in: 'Mention when asked about working with international teams',
          example_response: 'Netflix\'s global-first approach to content and operations appeals to me because it requires thinking beyond traditional US-centric tax strategies.'
        }
      ],
      recent_developments: [
        {
          development: 'Password sharing crackdown increased revenue complexity',
          relevance_to_role: 'Creates new revenue recognition and tax allocation challenges',
          conversation_starters: ['I noticed the recent changes to password sharing policies', 'How has the password sharing initiative affected tax compliance?']
        }
      ]
    },
    recognition_training: {
      what_great_answers_sound_like: [
        'Demonstrates specific knowledge of Netflix\'s competitive advantages',
        'Shows understanding of international tax complexity vs traditional media',
        'References recent strategic developments naturally'
      ],
      how_to_demonstrate_company_knowledge: [
        'Compare Netflix\'s global operations to Disney/Amazon Prime\'s approach',
        'Reference specific content investment figures and their tax implications',
        'Discuss how recent business model changes create new compliance challenges'
      ]
    }
  };

  console.log('📚 Sample Candidate Prep Guide (CI Integration):');
  console.log(`   Strategic Advantages: ${samplePrepGuide.ci_talking_points.strategic_advantages.length} talking points`);
  console.log(`   Recent Developments: ${samplePrepGuide.ci_talking_points.recent_developments.length} conversation starters`);
  console.log(`   Recognition Training: ${samplePrepGuide.recognition_training.what_great_answers_sound_like.length} indicators`);

  console.log('\n💡 Example Transformation:');
  console.log('   Generic Answer: "I want to work at Netflix because I love the shows"');
  console.log('   CI-Enhanced Answer: "Netflix\'s $15B content investment vs Disney\'s $8B creates unique international tax challenges that excite me as a tax professional..."');

  console.log('\n🎯 System Benefits:');
  console.log('   ✅ Generates 5 realistic personas using competitive intelligence');
  console.log('   ✅ Creates standard questions that work at any company');
  console.log('   ✅ Provides competitive intelligence to help candidates excel');
  console.log('   ✅ Transforms generic answers into insider-level responses');
  console.log('   ✅ Focuses on non-technical interviews (behavioral/cultural fit)');

  console.log('\n🚀 SYSTEM READY: Non-Technical Curriculum Generation Complete!');

  return {
    personas: generatedPersonas.length,
    questions: Object.keys(sampleQuestions).length,
    prepGuides: 1,
    competitiveAdvantages: competitiveIntelligence.strategicAdvantages.length,
    recentDevelopments: competitiveIntelligence.recentDevelopments.length
  };
}

// Run demo
if (require.main === module) {
  const results = demoNetflixCurriculumSystem();
  console.log(`\n📊 Demo Results: ${results.personas} personas, ${results.competitiveAdvantages} advantages, ${results.recentDevelopments} developments`);
}

export { demoNetflixCurriculumSystem };