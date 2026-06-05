export interface IcdEntry {
  code: string;
  description: string;
}

export const ICD_CODES: IcdEntry[] = [
  // Cardiovascular — Chapter IX
  { code: 'I10',   description: 'Essential (primary) hypertension' },
  { code: 'I11.9', description: 'Hypertensive heart disease without heart failure' },
  { code: 'I20.9', description: 'Angina pectoris, unspecified' },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified' },
  { code: 'I25.1', description: 'Atherosclerotic heart disease' },
  { code: 'I48.9', description: 'Atrial fibrillation and flutter, unspecified' },
  { code: 'I50.9', description: 'Heart failure, unspecified' },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified' },
  { code: 'I64',   description: 'Stroke, not specified as haemorrhage or infarction' },
  { code: 'I70.9', description: 'Generalised and unspecified atherosclerosis' },
  { code: 'I83.9', description: 'Varicose veins of lower extremities without complication' },

  // Endocrine & Metabolic — Chapter IV
  { code: 'E03.9', description: 'Hypothyroidism, unspecified' },
  { code: 'E05.9', description: 'Thyrotoxicosis, unspecified' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'E11.6', description: 'Type 2 diabetes mellitus with other specified complications' },
  { code: 'E55.9', description: 'Vitamin D deficiency, unspecified' },
  { code: 'E61.1', description: 'Iron deficiency' },
  { code: 'E66.9', description: 'Obesity, unspecified' },
  { code: 'E78.5', description: 'Hyperlipidaemia, unspecified' },
  { code: 'E86',   description: 'Volume depletion' },
  { code: 'E87.1', description: 'Hypo-osmolality and hyponatraemia' },

  // Respiratory — Chapter X
  { code: 'J00',   description: 'Acute nasopharyngitis [common cold]' },
  { code: 'J02.9', description: 'Acute pharyngitis, unspecified' },
  { code: 'J03.9', description: 'Acute tonsillitis, unspecified' },
  { code: 'J04.0', description: 'Acute laryngitis' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
  { code: 'J20.9', description: 'Acute bronchitis, unspecified' },
  { code: 'J22',   description: 'Unspecified acute lower respiratory infection' },
  { code: 'J30.9', description: 'Allergic rhinitis, unspecified' },
  { code: 'J32.9', description: 'Chronic sinusitis, unspecified' },
  { code: 'J44.0', description: 'COPD with acute lower respiratory infection' },
  { code: 'J44.1', description: 'COPD with acute exacerbation' },
  { code: 'J45.9', description: 'Asthma, unspecified' },

  // Digestive — Chapter XI
  { code: 'K21.0', description: 'Gastro-oesophageal reflux disease with oesophagitis' },
  { code: 'K21.9', description: 'Gastro-oesophageal reflux disease without oesophagitis' },
  { code: 'K29.7', description: 'Gastritis, unspecified' },
  { code: 'K52.9', description: 'Noninfective gastroenteritis and colitis, unspecified' },
  { code: 'K57.9', description: 'Diverticular disease of intestine, unspecified part, without perforation or abscess' },
  { code: 'K58.9', description: 'Irritable bowel syndrome without diarrhoea' },
  { code: 'K59.0', description: 'Constipation' },
  { code: 'K59.1', description: 'Functional diarrhoea' },
  { code: 'K76.0', description: 'Fatty (change of) liver, not elsewhere classified' },
  { code: 'K80.2', description: 'Calculus of gallbladder without cholecystitis' },
  { code: 'K92.1', description: 'Melaena' },

  // Genitourinary — Chapter XIV
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified' },
  { code: 'N20.0', description: 'Calculus of kidney' },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
  { code: 'N40',   description: 'Benign prostatic hyperplasia' },
  { code: 'N91.2', description: 'Amenorrhoea, unspecified' },
  { code: 'N92.0', description: 'Excessive and frequent menstruation with regular cycle' },
  { code: 'N94.3', description: 'Premenstrual tension syndrome' },
  { code: 'N95.1', description: 'Menopausal and female climacteric states' },

  // Musculoskeletal — Chapter XIII
  { code: 'M06.9', description: 'Rheumatoid arthritis, unspecified' },
  { code: 'M10.9', description: 'Gout, unspecified' },
  { code: 'M19.9', description: 'Arthrosis, unspecified' },
  { code: 'M25.5', description: 'Pain in joint' },
  { code: 'M47.9', description: 'Spondylosis, unspecified' },
  { code: 'M54.2', description: 'Cervicalgia' },
  { code: 'M54.4', description: 'Lumbago with sciatica' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'M75.1', description: 'Rotator cuff syndrome' },
  { code: 'M79.6', description: 'Pain in limb' },
  { code: 'M81.9', description: 'Osteoporosis, unspecified' },

  // Skin & Subcutaneous Tissue — Chapter XII
  { code: 'L20.9', description: 'Atopic dermatitis, unspecified' },
  { code: 'L23.9', description: 'Allergic contact dermatitis, unspecified cause' },
  { code: 'L30.9', description: 'Dermatitis, unspecified' },
  { code: 'L40.9', description: 'Psoriasis, unspecified' },
  { code: 'L50.9', description: 'Urticaria, unspecified' },

  // Symptoms & Signs — Chapter XVIII
  { code: 'R00.0', description: 'Tachycardia, unspecified' },
  { code: 'R00.1', description: 'Bradycardia, unspecified' },
  { code: 'R05',   description: 'Cough' },
  { code: 'R06.0', description: 'Dyspnoea' },
  { code: 'R06.2', description: 'Wheezing' },
  { code: 'R07.9', description: 'Chest pain, unspecified' },
  { code: 'R10.9', description: 'Unspecified abdominal pain' },
  { code: 'R11',   description: 'Nausea and vomiting' },
  { code: 'R42',   description: 'Dizziness and giddiness' },
  { code: 'R50.9', description: 'Fever, unspecified' },
  { code: 'R51',   description: 'Headache' },
  { code: 'R52',   description: 'Pain, unspecified' },
  { code: 'R53',   description: 'Malaise and fatigue' },
  { code: 'R55',   description: 'Syncope and collapse' },
  { code: 'R60.0', description: 'Localised oedema' },
  { code: 'R63.0', description: 'Anorexia' },

  // Factors Affecting Health — Chapter XXI
  { code: 'Z00.0', description: 'Examination for administrative purposes' },
  { code: 'Z00.1', description: 'Routine child health examination' },
  { code: 'Z13.1', description: 'Screening examination for diabetes mellitus' },
  { code: 'Z23',   description: 'Need for immunization against single bacterial diseases' },
  { code: 'Z30.9', description: 'Contraceptive management, unspecified' },
  { code: 'Z34.9', description: 'Supervision of normal pregnancy, unspecified' },
  { code: 'Z71.3', description: 'Dietary counselling and surveillance' },
  { code: 'Z76.0', description: 'Issue of repeat prescription' },

  // Mental & Behavioural — Chapter V
  { code: 'F32.9', description: 'Depressive episode, unspecified' },
  { code: 'F33.9', description: 'Recurrent depressive disorder, unspecified' },
  { code: 'F41.1', description: 'Generalised anxiety disorder' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified' },
  { code: 'F43.1', description: 'Post-traumatic stress disorder' },
  { code: 'F51.0', description: 'Nonorganic insomnia' },

  // Nervous System — Chapter VI
  { code: 'G43.9', description: 'Migraine, unspecified' },
  { code: 'G44.3', description: 'Chronic post-traumatic headache' },
  { code: 'G62.9', description: 'Polyneuropathy, unspecified' },

  // Eye & Adnexa — Chapter VII
  { code: 'H10.9', description: 'Conjunctivitis, unspecified' },
  { code: 'H52.1', description: 'Myopia' },
  { code: 'H52.4', description: 'Presbyopia' },

  // Ear & Mastoid — Chapter VIII
  { code: 'H66.9', description: 'Otitis media, unspecified' },
  { code: 'H81.1', description: 'Benign paroxysmal vertigo' },
  { code: 'H93.1', description: 'Tinnitus' },

  // Infectious Diseases — Chapter I
  { code: 'A09',   description: 'Other gastroenteritis and colitis of infectious and unspecified origin' },
  { code: 'A15.9', description: 'Respiratory tuberculosis, unspecified' },
  { code: 'B00.9', description: 'Herpesviral infection, unspecified' },
  { code: 'B18.1', description: 'Chronic viral hepatitis B without delta-agent' },
  { code: 'B18.2', description: 'Chronic viral hepatitis C' },
  { code: 'B34.9', description: 'Viral infection, unspecified' },

  // Injury & External Causes — Chapter XIX
  { code: 'T78.1', description: 'Other adverse food reactions, not elsewhere classified' },
  { code: 'T78.4', description: 'Allergy, unspecified' },
];
