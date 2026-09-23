/**
 * Terms of Service, Privacy Policy and Imprint.
 *
 * Extracted verbatim from the pages sportstechx.com has served until now, with
 * one deliberate change: the subscription tiers are named Explore / Raise /
 * Scout rather than the old Explorer / Growth / Pro. That is the ONLY edit to
 * the legal copy - see the 'Subscription Tiers' section below.
 *
 * Structured rather than hand-written as JSX so the markup and the typography
 * live in one renderer, and so a copy change stays a data edit.
 */

export type LegalBlock =
	| { kind: 'p'; label?: string; text: string }
	| { kind: 'list'; items: { label?: string; text: string }[] };

export interface LegalSection {
	level: 2 | 3;
	heading: string;
	blocks: LegalBlock[];
}

export interface LegalDoc {
	title: string;
	subtitle?: string;
	updated?: string;
	sections: LegalSection[];
}


export const termsOfService: LegalDoc = {
	title: 'Terms of Service',
	subtitle: 'SportsTechX Intelligence Hub',
	updated: 'December 2025',
	sections: [
		{
			level: 2,
			heading: 'Agreement to Terms',
			blocks: [
				{ kind: 'p', text: 'These Terms of Service ("Terms") govern your access to and use of the SportsTechX Intelligence Platform and related services (the "Service") operated by SportsTechX GmbH ("SportsTechX", "we", "us", or "our").' },
				{ kind: 'p', text: 'By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service.' },
				{ kind: 'p', label: 'Age Requirement:', text: 'You must be at least 18 years of age to use the Service. By using the Service, you represent and warrant that you are 18 years of age or older.' },
				{ kind: 'p', label: 'Service Provider:', text: '' },
				{
					kind: 'list',
					items: [
						{ text: 'Company: SportsTechX GmbH' },
						{ text: 'Address: Liebigstraße 35, 10247 Berlin, Germany' },
						{ text: 'Email: hello@sportstechx.com' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'Description of Service',
			blocks: [
				{ kind: 'p', text: 'SportsTechX provides a comprehensive intelligence platform for the sports technology industry, including:' },
				{
					kind: 'list',
					items: [
						{ text: 'Access to our database of sportstech startups and companies' },
						{ text: 'Deal-flow tracking and investment monitoring' },
						{ text: 'M&A deals and market analytics' },
						{ text: 'Industry reports and research publications' },
						{ text: 'AI-powered search and analysis tools' },
					],
				},
				{ kind: 'p', text: 'We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. We will make reasonable efforts to notify users of material changes to core features.' },
			],
		},
		{
			level: 2,
			heading: 'Subscription Plans & Billing',
			blocks: [
			],
		},
		{
			level: 3,
			heading: 'Subscription Tiers',
			blocks: [
				{ kind: 'p', text: 'We offer multiple subscription tiers with varying levels of access:' },
				{
					kind: 'list',
					items: [
						{ label: 'Explore (Free):', text: 'Limited access to basic features' },
						{ label: 'Raise:', text: 'Enhanced access with additional features' },
						{ label: 'Scout:', text: 'Full platform access with premium features' },
					],
				},
				{ kind: 'p', text: 'Details of each plan are available on our pricing page.' },
			],
		},
		{
			level: 3,
			heading: 'Free Trial',
			blocks: [
				{ kind: 'p', text: 'We may offer free trials for certain subscription plans. At the end of the trial period, your subscription will automatically convert to a paid subscription unless you cancel before the trial ends. We will notify you before the trial period expires.' },
			],
		},
		{
			level: 3,
			heading: 'Billing',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Paid subscriptions are billed in advance on a monthly or annual basis' },
						{ text: 'All payments are processed securely through Stripe, our third-party payment processor' },
						{ text: 'By subscribing, you authorize us to charge your payment method for the applicable fees' },
						{ text: 'Annual subscriptions are billed once per year and provide access for 12 months from the billing date' },
						{ text: 'Monthly subscriptions are billed on the same day each month' },
						{ text: 'All fees are exclusive of applicable taxes, which will be added to your invoice where required by law' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Price Changes',
			blocks: [
				{ kind: 'p', text: 'We may change our subscription fees at any time. We will provide paying subscribers with at least 30 days advance notice of any price changes by email or through the Service. Price changes will take effect at the start of your next billing cycle after the notice period. If you do not agree to the price change, you may cancel your subscription before the new price takes effect.' },
			],
		},
		{
			level: 3,
			heading: 'Failed Payments',
			blocks: [
				{ kind: 'p', text: 'If a payment fails, our payment processor will notify you and automatically retry the payment according to their retry schedule. If payment continues to fail after multiple attempts, we may suspend or terminate your access to the Service. You are responsible for providing current, complete, and accurate billing information and updating it as necessary.' },
			],
		},
		{
			level: 3,
			heading: 'Cancellation & Refunds',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'You may cancel your subscription at any time through your account settings or by contacting support' },
						{ text: 'Upon cancellation, you will retain access until the end of your current billing period' },
						{ text: 'No refunds will be provided for partial subscription periods, except as required by law or at our sole discretion' },
						{ text: 'If you cancel during a free trial, your access will end immediately and you will not be charged' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'User Responsibilities',
			blocks: [
				{ kind: 'p', text: 'As a user of our Service, you agree to:' },
				{
					kind: 'list',
					items: [
						{ text: 'Provide accurate and complete information when creating your account' },
						{ text: 'Maintain the security of your account credentials and not share your login' },
						{ text: 'Use the Service only for lawful purposes and in accordance with these Terms' },
						{ text: 'Not attempt to gain unauthorized access to any part of the Service' },
						{ text: 'Notify us immediately of any unauthorized use of your account' },
						{ text: 'Comply with all applicable laws and regulations' },
						{ text: 'Keep your account information current and accurate' },
						{ text: 'Comply with any applicable third-party terms, including those of our payment processor Stripe' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'Prohibited Activities',
			blocks: [
				{ kind: 'p', text: 'You may NOT use the Service to:' },
				{
					kind: 'list',
					items: [
						{ text: 'Scrape, crawl, or use automated systems to extract data from the platform' },
						{ text: 'Redistribute, resell, or commercially exploit our data without authorization' },
						{ text: 'Interfere with or disrupt the Service or servers connected to the Service' },
						{ text: 'Attempt to reverse engineer or decompile any part of the Service' },
						{ text: 'Upload malicious code or content that violates the rights of others' },
						{ text: 'Use the Service for any illegal or unauthorized purpose' },
						{ text: 'Share your account credentials with others' },
						{ text: 'Create multiple accounts to circumvent restrictions' },
						{ text: 'Violate any applicable local, state, national, or international law' },
						{ text: 'Impersonate any person or entity or falsely state or misrepresent your affiliation with a person or entity' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'Intellectual Property',
			blocks: [
			],
		},
		{
			level: 3,
			heading: 'Our Content',
			blocks: [
				{ kind: 'p', text: 'The Service and its original content, features, and functionality are owned by SportsTechX and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.' },
			],
		},
		{
			level: 3,
			heading: 'Your Content',
			blocks: [
				{ kind: 'p', text: 'You retain ownership of any content you submit to the Service (such as notes, saved searches, or annotations). By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, store, display, reproduce, and distribute that content solely as necessary to provide and improve the Service. This license terminates when you delete your content or account, except for content that has been shared with others or where continued storage is required by law.' },
				{ kind: 'p', text: 'You represent and warrant that you own or have the necessary rights to any content you submit and that your content does not violate any third-party rights or applicable laws.' },
			],
		},
		{
			level: 3,
			heading: 'Data Usage',
			blocks: [
				{ kind: 'p', text: 'Our database content is provided for your personal or internal business use only. You may not:' },
				{
					kind: 'list',
					items: [
						{ text: 'Reproduce or distribute our data without our prior written consent' },
						{ text: 'Create derivative works from our data' },
						{ text: 'Use our data to build competing products or services' },
						{ text: 'Share access credentials with unauthorized users' },
						{ text: 'Copy, download, or store significant portions of our database' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'Privacy & Data Protection',
			blocks: [
				{ kind: 'p', text: 'Your use of the Service is governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our data collection and processing practices.' },
				{ kind: 'p', text: 'We process your personal data in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws. Under GDPR, you have the following rights:' },
				{
					kind: 'list',
					items: [
						{ text: 'Right of access to your personal data' },
						{ text: 'Right to rectification of inaccurate data' },
						{ text: 'Right to erasure (right to be forgotten)' },
						{ text: 'Right to data portability' },
						{ text: 'Right to restrict or object to processing' },
						{ text: 'Right to withdraw consent' },
					],
				},
				{ kind: 'p', text: 'To exercise any of these rights or for any data protection inquiries, please contact us at hello@sportstechx.com.' },
				{ kind: 'p', text: 'We retain your data only as long as necessary to provide the Service and as described in our Privacy Policy. When you delete your account, we will delete your personal data within 30 days, except where retention is required by law.' },
			],
		},
		{
			level: 2,
			heading: 'Third-Party Services',
			blocks: [
				{ kind: 'p', text: 'The Service may integrate with or contain links to third-party services, including:' },
				{
					kind: 'list',
					items: [
						{ text: 'Stripe for payment processing' },
						{ text: 'Analytics providers' },
						{ text: 'Other third-party tools and services' },
					],
				},
				{ kind: 'p', text: 'These third-party services are governed by their own terms of service and privacy policies. We are not responsible for the practices or content of third-party services. Your use of third-party services is at your own risk, and you should review their terms and policies before use.' },
			],
		},
		{
			level: 2,
			heading: 'Disclaimers & Limitation of Liability',
			blocks: [
			],
		},
		{
			level: 3,
			heading: 'Service Provided "As Is"',
			blocks: [
				{ kind: 'p', text: 'The Service is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We make no warranties, expressed or implied, regarding:' },
				{
					kind: 'list',
					items: [
						{ text: 'The Service\'s reliability, availability, or uptime' },
						{ text: 'The accuracy, completeness, or timeliness of any information' },
						{ text: 'The Service meeting your specific requirements or expectations' },
						{ text: 'The Service being uninterrupted, secure, or error-free' },
						{ text: 'Any defects or errors being corrected' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Data Accuracy',
			blocks: [
				{ kind: 'p', text: 'While we strive to maintain accurate and up-to-date information, we do not guarantee the accuracy, completeness, or timeliness of any data in our database. Information should be independently verified before making business or investment decisions. We are not responsible for any decisions made based on information provided through the Service.' },
			],
		},
		{
			level: 3,
			heading: 'Limitation of Liability',
			blocks: [
				{ kind: 'p', text: 'To the maximum extent permitted by applicable law, SportsTechX, its affiliates, officers, directors, employees, agents, and licensors shall not be liable for any:' },
				{
					kind: 'list',
					items: [
						{ text: 'Indirect, incidental, special, consequential, or punitive damages' },
						{ text: 'Loss of profits, revenue, data, or business opportunities' },
						{ text: 'Damages resulting from your reliance on information provided through the Service' },
						{ text: 'Service interruptions, data loss, or system failures' },
						{ text: 'Unauthorized access to or alteration of your data' },
						{ text: 'Any other matter relating to the Service' },
					],
				},
				{ kind: 'p', text: 'Our total aggregate liability to you for all claims arising from or related to the Service shall not exceed the amount you paid us for the Service in the 12 months preceding the claim, or €100, whichever is greater.' },
				{ kind: 'p', text: 'Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you. In such cases, our liability will be limited to the fullest extent permitted by applicable law.' },
			],
		},
		{
			level: 2,
			heading: 'Indemnification',
			blocks: [
				{ kind: 'p', text: 'You agree to indemnify, defend, and hold harmless SportsTechX and its affiliates, officers, directors, employees, agents, and licensors from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys\' fees) arising out of or related to:' },
				{
					kind: 'list',
					items: [
						{ text: 'Your use or misuse of the Service' },
						{ text: 'Your violation of these Terms' },
						{ text: 'Your violation of any third-party rights' },
						{ text: 'Any content you submit to the Service' },
						{ text: 'Your violation of any applicable laws or regulations' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'Account Termination',
			blocks: [
			],
		},
		{
			level: 3,
			heading: 'Termination By You',
			blocks: [
				{ kind: 'p', text: 'You may delete your account at any time through the account settings or by contacting our support team at hello@sportstechx.com. Upon termination, your right to access and use the Service will immediately cease.' },
			],
		},
		{
			level: 3,
			heading: 'Termination By Us',
			blocks: [
				{ kind: 'p', text: 'We reserve the right to suspend or terminate your account and access to the Service, with or without notice, if you:' },
				{
					kind: 'list',
					items: [
						{ text: 'Violate these Terms or our Privacy Policy' },
						{ text: 'Engage in activity that may harm the Service, our business, or other users' },
						{ text: 'Fail to pay applicable fees when due' },
						{ text: 'Provide false, inaccurate, or misleading information' },
						{ text: 'Engage in fraudulent or illegal activities' },
						{ text: 'Create risk or possible legal exposure for us' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Effect of Termination',
			blocks: [
				{ kind: 'p', text: 'Upon termination of your account:' },
				{
					kind: 'list',
					items: [
						{ text: 'Your right to use the Service will immediately cease' },
						{ text: 'We may delete your account data in accordance with our Privacy Policy and data retention practices' },
						{ text: 'All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnification, and limitations of liability' },
						{ text: 'You will not be entitled to any refund of fees paid prior to termination' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'Force Majeure',
			blocks: [
				{ kind: 'p', text: 'We shall not be liable for any failure or delay in performing our obligations under these Terms due to circumstances beyond our reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.' },
			],
		},
		{
			level: 2,
			heading: 'Dispute Resolution',
			blocks: [
			],
		},
		{
			level: 3,
			heading: 'Informal Resolution',
			blocks: [
				{ kind: 'p', text: 'Before filing a claim, you agree to try to resolve the dispute informally by contacting us at hello@sportstechx.com. We will attempt to resolve the dispute informally within 60 days. If we are unable to resolve the dispute within 60 days, either party may pursue formal dispute resolution.' },
			],
		},
		{
			level: 3,
			heading: 'Governing Law & Jurisdiction',
			blocks: [
				{ kind: 'p', text: 'These Terms shall be governed by and construed in accordance with the laws of Germany, without regard to its conflict of law provisions.' },
				{ kind: 'p', text: 'Any disputes arising from these Terms or the Service shall be resolved exclusively in the courts of Berlin, Germany. You consent to the personal jurisdiction of these courts and waive any objection to venue in these courts.' },
			],
		},
		{
			level: 3,
			heading: 'EU Online Dispute Resolution',
			blocks: [
				{ kind: 'p', text: 'The European Commission provides an online dispute resolution platform, which you can access at https://ec.europa.eu/consumers/odr. We are not obliged and generally not willing to participate in dispute resolution proceedings before a consumer arbitration board.' },
			],
		},
		{
			level: 2,
			heading: 'Changes to Terms',
			blocks: [
				{ kind: 'p', text: 'We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the "Last Updated" date.' },
				{ kind: 'p', text: 'Your continued use of the Service after such changes constitutes your acceptance of the new Terms. If you do not agree to the modified Terms, you should discontinue your use of the Service.' },
			],
		},
		{
			level: 2,
			heading: 'Contact Us',
			blocks: [
				{ kind: 'p', text: 'If you have any questions about these Terms, please contact us at:' },
				{ kind: 'p', label: 'Email:', text: 'hello@sportstechx.com' },
				{ kind: 'p', label: 'Address:', text: 'SportsTechX GmbH, Liebigstraße 35, 10247 Berlin, Germany' },
				{ kind: 'p', text: 'Last updated: December 2025' },
			],
		},
	],
};

export const privacyPolicy: LegalDoc = {
	title: 'Privacy Policy',
	sections: [
		{
			level: 2,
			heading: 'General Information',
			blocks: [
				{ kind: 'p', text: 'SportsTechX GmbH takes the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations and this privacy policy.' },
				{ kind: 'p', text: 'The use of our website and services is generally possible without providing personal data. However, if a data subject wants to use special enterprise services, including Intelligence Platform features and Playmakers membership services, via our website, processing of personal data could become necessary.' },
			],
		},
		{
			level: 2,
			heading: 'Controller Information',
			blocks: [
				{ kind: 'p', label: 'SportsTechX GmbH', text: '' },
				{ kind: 'p', text: 'Liebigstraße 35' },
				{ kind: 'p', text: '10247 Berlin, Germany' },
				{ kind: 'p', label: 'Email:', text: 'hello@sportstechx.com' },
				{ kind: 'p', label: 'Phone:', text: '+491602615931' },
			],
		},
		{
			level: 2,
			heading: 'Scope of This Policy',
			blocks: [
				{ kind: 'p', text: 'This Privacy Policy applies to:' },
				{
					kind: 'list',
					items: [
						{ text: 'The SportsTechX website and intelligence platform' },
						{ text: 'The Playmakers private network for sports tech founders, including:Member applications and onboardingMember profiles and directory servicesCore group advisory sessionsMember events and programmingCommunity platforms (WhatsApp, online discussion boards)Curated introduction servicesSportsTechX Intelligence Hub access' },
						{ text: 'Research studies and benchmark surveys conducted by SportsTechX, including the Sports Tech VC Deal Sourcing Benchmark Study 2026' },
					],
				},
				{
					kind: 'list',
					items: [
						{ text: 'Member applications and onboarding' },
						{ text: 'Member profiles and directory services' },
						{ text: 'Core group advisory sessions' },
						{ text: 'Member events and programming' },
						{ text: 'Community platforms (WhatsApp, online discussion boards)' },
						{ text: 'Curated introduction services' },
						{ text: 'SportsTechX Intelligence Hub access' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'Data Collection and Usage',
			blocks: [
			],
		},
		{
			level: 3,
			heading: 'Intelligence Platform Data',
			blocks: [
				{ kind: 'p', text: 'When you create an account for the Intelligence Platform, we collect:' },
				{
					kind: 'list',
					items: [
						{ text: 'Email address, full name, company name, job title, and country' },
						{ text: 'Usage data: pages visited, features used, interactions with our services, login frequency and patterns' },
						{ text: 'User-generated content: saved searches, favorites, notes on companies, and company claims' },
					],
				},
				{ kind: 'p', text: 'This information is necessary to provide you with access to our platform and personalize your experience.' },
			],
		},
		{
			level: 3,
			heading: 'Website Analytics',
			blocks: [
				{ kind: 'p', text: 'We use Google Analytics to analyze website usage. This service uses cookies to collect anonymous information about how visitors use our site. The information generated about your use of the website is transmitted to and stored by Google on servers in the United States.' },
			],
		},
		{
			level: 3,
			heading: 'Playmakers Membership Data',
			blocks: [
				{ kind: 'p', text: 'When you apply for or become a member of Playmakers, we collect and process the following categories of personal and/or company data:' },
				{ kind: 'p', text: 'Application and Registration Data:' },
				{
					kind: 'list',
					items: [
						{ text: 'Full name, email address, phone number, and location (city, country)' },
						{ text: 'Professional information: current company name, role/title, LinkedIn profile' },
						{ text: 'Company information: industry vertical, business model and key challenges' },
						{ text: 'Financial qualification data: annual company revenue, funding raised, or exit value' },
						{ text: 'Areas of expertise and interests relevant to sports technology' },
						{ text: 'Membership goals and what you hope to achieve through Playmakers' },
						{ text: 'Referral source and nominator information (if applicable)' },
					],
				},
				{ kind: 'p', text: 'Member Profile Data:' },
				{
					kind: 'list',
					items: [
						{ text: 'Professional biography and accomplishments' },
						{ text: 'Profile photo and other images you choose to upload' },
						{ text: 'Skills, expertise areas, and topics where you can help other members' },
						{ text: 'Preferences for core group composition and member connections' },
					],
				},
				{ kind: 'p', text: 'Financial and Payment Data:' },
				{
					kind: 'list',
					items: [
						{ text: 'Credit card or payment information (processed by our third-party payment provider)' },
						{ text: 'Billing address and transaction history' },
						{ text: 'Membership fee payments and subscription status' },
					],
				},
				{ kind: 'p', text: 'Engagement and Activity Data:' },
				{
					kind: 'list',
					items: [
						{ text: 'Core group attendance and participation records' },
						{ text: 'Event registrations and attendance' },
						{ text: 'Communications sent through our platforms (WhatsApp, discussion boards)' },
						{ text: 'Feedback, survey responses, and program evaluations' },
						{ text: 'Introduction requests and networking activity' },
					],
				},
				{ kind: 'p', text: 'Communications Data:' },
				{
					kind: 'list',
					items: [
						{ text: 'Messages exchanged with SportsTechX team members' },
						{ text: 'Questions, feedback, and support requests' },
						{ text: 'Preferences for receiving communications and marketing materials' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Benchmark Study and Survey Data',
			blocks: [
				{ kind: 'p', text: 'SportsTechX conducts primary research studies and benchmark surveys to generate sector-level intelligence for the sports technology investment community. This section describes how we collect and process data in connection with these activities, including the Sports Tech VC Deal Sourcing Benchmark Study 2026.' },
				{ kind: 'p', text: 'What Data We Collect' },
				{ kind: 'p', text: 'When you participate in a SportsTechX benchmark survey, we collect the following categories of data:' },
				{
					kind: 'list',
					items: [
						{ text: 'Contact and identification data: your full name, fund or firm name, and email address, collected on the final page of the survey for the purpose of delivering your results.' },
						{ text: 'Investment profile data: your fund\'s primary investment stage, geographic focus, total fund size (by band), and the total number of sports tech investments completed to date.' },
						{ text: 'Deal sourcing practice data: current sourcing channels and their relative contribution to deal flow, deal flow volume reviewed per month, satisfaction with current deal flow, primary sourcing challenges, team time allocation across sourcing activities, and use of data platforms.' },
						{ text: 'Historical deal attribution data: the sourcing channel through which each of your last three completed sports tech investments was originally identified.' },
						{ text: 'Capability and priority data: ratings of sourcing support mechanisms by value, and the priority assigned to increasing outbound sourcing activity over the next 12 months.' },
						{ text: 'Delivery and recognition preferences: your preferred method for receiving your personalised snapshot, and whether you consent to being recognised as a founding contributor in the published report.' },
					],
				},
				{ kind: 'p', text: 'Legal Basis for Processing' },
				{ kind: 'p', text: 'We process benchmark survey data on the basis of legitimate interests (Article 6(1)(f) GDPR) — specifically, our interest in producing rigorous, independent research that serves the sports technology investment community, and our legitimate commercial interest in following up with participants regarding relevant SportsTechX services and research initiatives. Where you provide explicit consent (for example, to be named as a founding contributor in the published report), we process that specific data on the basis of consent (Article 6(1)(a) GDPR).' },
				{ kind: 'p', text: 'Confidentiality Commitment' },
				{ kind: 'p', text: 'We are committed to the following confidentiality standards for all benchmark survey responses:' },
				{
					kind: 'list',
					items: [
						{ text: 'Individual responses are never published, attributed, or shared in a form that identifies any individual fund, firm, or respondent.' },
						{ text: 'All findings in the published benchmark report are presented in aggregate form only, drawing on the combined responses of all participating funds.' },
						{ text: 'Your personalised sourcing snapshot — a one-page benchmarking document delivered privately to you — contains only your own response data compared against anonymised peer group aggregates. It is not shared with any other party.' },
						{ text: 'No fund-specific data is shared externally without your explicit prior consent.' },
					],
				},
				{ kind: 'p', text: 'Use of Contact Data' },
				{ kind: 'p', text: 'Contact data collected at the end of the survey (name, fund name, and email address) is used for the following purposes:' },
				{
					kind: 'list',
					items: [
						{ text: 'Delivering your personalised sourcing snapshot' },
						{ text: 'Providing access to the full benchmark report ahead of public release' },
						{ text: 'Providing your complimentary 30-day Pro access to the SportsTechX Intelligence Hub' },
						{ text: 'Following up with you in connection with your participation and to share information about SportsTechX research, services, and initiatives that may be relevant to your fund\'s investment practice and deal sourcing capabilities' },
					],
				},
				{ kind: 'p', text: 'All follow-up communications are sent on the basis of legitimate interests. You may opt out of non-essential communications at any time by contacting hello@sportstechx.com or using the unsubscribe link included in any email communication.' },
			],
		},
		{
			level: 2,
			heading: 'How We Use Intelligence Platform Data',
			blocks: [
				{ kind: 'p', text: 'We use your Intelligence Platform data for the following purposes:' },
			],
		},
		{
			level: 2,
			heading: 'How We Use Playmakers Member Data',
			blocks: [
				{ kind: 'p', text: 'We use your personal data collected through Playmakers for the following purposes:' },
			],
		},
		{
			level: 3,
			heading: 'Service Delivery:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Process and evaluate membership applications' },
						{ text: 'Create and maintain your member profile in our directory' },
						{ text: 'Assign you to an appropriate core group based on your profile, location, and preferences' },
						{ text: 'Facilitate core group sessions with professional coaches/facilitators' },
						{ text: 'Provide access to member events, programming, and community platforms' },
						{ text: 'Facilitate curated introductions to other members, investors, and industry contacts' },
						{ text: 'Grant access to the SportsTechX Intelligence Hub' },
						{ text: 'Communicate with you about your membership, including updates, events, and administrative matters' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Community Building and Networking:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Enable other members to find and connect with you through the member directory' },
						{ text: 'Match members for introductions based on complementary expertise and interests' },
						{ text: 'Organize and promote relevant events and programming' },
						{ text: 'Foster meaningful connections within the sports tech founder community' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Program Improvement:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Analyze member engagement to improve our services' },
						{ text: 'Gather feedback to enhance core group experiences and programming' },
						{ text: 'Develop new features and benefits for members' },
						{ text: 'Assess and improve core group facilitation quality' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Legal and Operational:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Process membership fees and maintain financial records' },
						{ text: 'Enforce our Membership Terms, Code of Conduct, and Confidentiality Pledge' },
						{ text: 'Comply with legal obligations and respond to legal requests' },
						{ text: 'Protect against fraudulent, unauthorized, or illegal activity' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'How We Share Data',
			blocks: [
				{ kind: 'p', text: 'We do not sell your personal data to third parties. We share your personal data with the following parties:' },
			],
		},
		{
			level: 3,
			heading: 'Other Playmakers Members:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Your member profile information (name, photo, company, role, expertise, location) is visible to other members through our member directory' },
						{ text: 'Information you choose to share in core groups, on community platforms, or at events' },
						{ text: 'You control what information appears in your member profile and can update it at any time' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Core Group Coaches and Facilitators:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'We share relevant member information with professional coaches/facilitators who lead core group sessions' },
						{ text: 'This includes your profile, background, areas of expertise, key business challenges, and participation in core group discussions' },
						{ text: 'Facilitators are bound by confidentiality obligations and professional ethics requirements' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Service Providers:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Payment processors (Stripe) for membership fee transactions' },
						{ text: 'Database and hosting providers (Supabase)' },
						{ text: 'Analytics services (Google Analytics, Mixpanel)' },
						{ text: 'Customer support platforms (Intercom)' },
						{ text: 'Customer relationship management (Attio)' },
						{ text: 'Company logo enrichment (Clearbit)' },
						{ text: 'Email delivery services (Loops)' },
						{ text: 'Event management and communication platforms' },
					],
				},
				{ kind: 'p', text: 'These service providers are authorized to use your data only as necessary to provide services to us and are carefully selected for their security practices and GDPR compliance.' },
			],
		},
		{
			level: 3,
			heading: 'Event Partners and Sponsors:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'When we co-host events with partners or sponsors, we may share relevant attendee information' },
						{ text: 'We will notify you and, where required by law, obtain your consent before sharing data with event partners' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Introduction and Networking Contacts:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'When facilitating curated introductions, we share relevant professional information with the parties being introduced' },
						{ text: 'This typically includes your name, company, role and areas of expertise' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Benchmark Study and Survey Data:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Individual survey responses collected through SportsTechX benchmark studies are never shared with any third party in a form that identifies individual respondents or their funds.' },
						{ text: 'Aggregate findings from the benchmark study are published in the SportsTechX benchmark report and may be shared publicly. No individual fund\'s data is identifiable in these aggregated outputs.' },
						{ text: 'Survey data is processed by SportsTechX\'s survey platform provider (Fillout) and our internal team only, under strict confidentiality obligations.' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Legal and Compliance:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'We may disclose your data to comply with legal obligations, court orders, or government requests' },
						{ text: 'To protect our rights, enforce our terms, or investigate potential violations' },
						{ text: 'In connection with a business transaction (merger, acquisition, sale of assets)' },
					],
				},
				{ kind: 'p', text: 'Information you share in core groups is subject to the Playmakers Confidentiality Pledge that all members agree to upon joining.' },
			],
		},
		{
			level: 2,
			heading: 'Member Profile Visibility and Control',
			blocks: [
				{ kind: 'p', text: 'Your Playmakers member profile is visible only to other verified Playmakers members, not to the general public or non-members who visit our website. You have control over what information appears in your member profile and can update or modify it at any time through your account settings.' },
				{ kind: 'p', text: 'Please note that information you choose to share voluntarily in core group discussions, on community platforms, or at events may be seen, heard, or collected by other members. We encourage all members to respect the confidentiality obligations outlined in the Playmakers Confidentiality Pledge.' },
			],
		},
		{
			level: 2,
			heading: 'Payment Processing',
			blocks: [
				{ kind: 'p', text: 'Intelligence Platform and Playmakers membership fees are processed by third-party payment processors (such as Stripe). We do not directly store your complete credit card information. Our payment processors maintain PCI-DSS compliance and handle your payment data in accordance with their own privacy policies. We receive only transaction confirmations and the information necessary for billing purposes (such as the last four digits of your card and transaction amounts).' },
			],
		},
		{
			level: 2,
			heading: 'Newsletter Subscription',
			blocks: [
				{ kind: 'p', text: 'If you subscribe to our newsletter, we collect your email address and any other information you voluntarily provide. This data is used solely for sending you our newsletter and related communications. You can unsubscribe at any time using the link provided in our emails.' },
			],
		},
		{
			level: 2,
			heading: 'Contact Forms',
			blocks: [
				{ kind: 'p', text: 'When you contact us through our website, we collect the information you provide in order to respond to your inquiry. This may include your name, email address, and the content of your message.' },
			],
		},
		{
			level: 2,
			heading: 'Cookies',
			blocks: [
				{ kind: 'p', text: 'Our website uses cookies to improve your browsing experience. Cookies are small text files that are stored on your device when you visit a website. You can configure your browser to refuse cookies or to indicate when cookies are being sent.' },
				{ kind: 'p', text: 'Essential cookies are necessary for the website to function properly, while analytics cookies help us understand how visitors interact with our website.' },
			],
		},
		{
			level: 2,
			heading: 'Your Rights',
			blocks: [
				{ kind: 'p', text: 'Under the General Data Protection Regulation (GDPR) and other applicable data protection laws, you have the following rights:' },
				{
					kind: 'list',
					items: [
						{ text: 'Right of access to your personal data' },
						{ text: 'Right to rectification of inaccurate personal data' },
						{ text: 'Right to erasure of your personal data' },
						{ text: 'Right to restriction of processing' },
						{ text: 'Right to data portability' },
						{ text: 'Right to object to processing' },
						{ text: 'Right to withdraw consent' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Additional Rights for Playmakers Members:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Right to access and download your member profile data' },
						{ text: 'Right to update your member profile and preferences at any time' },
						{ text: 'Right to opt-out of certain communications (while maintaining necessary membership communications)' },
						{ text: 'Right to request deletion of your member data upon termination of membership' },
					],
				},
			],
		},
		{
			level: 3,
			heading: 'Additional Rights for Benchmark Study Participants:',
			blocks: [
				{
					kind: 'list',
					items: [
						{ text: 'Right to withdraw from the study at any time before the data lock date by contacting hello@sportstechx.com' },
						{ text: 'Right to request deletion of your individual survey responses, subject to the study\'s data lock date' },
						{ text: 'Right to withdraw consent for founding contributor recognition at any time before the report\'s publication date' },
						{ text: 'Right to object to follow-up communications at any time by contacting hello@sportstechx.com' },
					],
				},
				{ kind: 'p', text: 'To exercise any of these rights, please contact us at hello@sportstechx.com.' },
				{ kind: 'p', text: 'Please note that certain data must be retained for legal and operational purposes even after account deletion or membership termination, such as financial transaction records and data necessary for legal compliance. Residual copies may remain in backup systems for a period of time.' },
			],
		},
		{
			level: 2,
			heading: 'Data Retention',
			blocks: [
				{ kind: 'p', text: 'We retain your personal data for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.' },
				{ kind: 'p', text: 'For Intelligence Platform users:' },
				{
					kind: 'list',
					items: [
						{ text: 'When you delete your account, we will delete your personal data within 30 days, except where we are required by law to retain certain information' },
					],
				},
				{ kind: 'p', text: 'For Playmakers members:' },
				{
					kind: 'list',
					items: [
						{ text: 'Active membership data is retained for the duration of your membership' },
						{ text: 'After membership termination, we retain certain data for legitimate business purposes including financial records (as required by law), member feedback and program evaluation data (in anonymized form), and data necessary to enforce our terms or resolve disputes' },
						{ text: 'You may request deletion of your data after membership termination, subject to our legal obligations to retain certain records' },
					],
				},
				{ kind: 'p', text: 'For Benchmark Study and Survey Participants:' },
				{
					kind: 'list',
					items: [
						{ text: 'Individual survey responses are retained for a period of 24 months from the study\'s publication date, after which they are deleted or fully anonymised.' },
						{ text: 'Aggregate and anonymised findings derived from survey responses may be retained indefinitely as part of SportsTechX\'s research archive.' },
						{ text: 'Contact data provided at the end of the survey (name, fund name, email) is retained for as long as necessary to deliver your results package and conduct any related follow-up, and is deleted or anonymised within 24 months of the study\'s publication date.' },
						{ text: 'You may request deletion of your individual response data at any time before the study\'s data lock date.' },
					],
				},
			],
		},
		{
			level: 2,
			heading: 'Data Security',
			blocks: [
				{ kind: 'p', text: 'We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Our security measures include encrypted data transmission, access controls limiting data access to authorized personnel only, regular security audits and assessments, and secure backup systems. However, no method of transmission over the internet is 100% secure.' },
				{ kind: 'p', text: 'Playmakers members are required to maintain the confidentiality of their account credentials and to notify us immediately of any unauthorized access to their account.' },
			],
		},
		{
			level: 2,
			heading: 'International Data Transfers',
			blocks: [
				{ kind: 'p', text: 'We are based in Germany, but our services include users and members from various countries. Your personal data may be transferred to and processed in countries other than your country of residence, including countries that may not provide the same level of data protection as your home country.' },
				{ kind: 'p', text: 'When we transfer personal data outside the European Economic Area (EEA), we implement appropriate safeguards such as Standard Contractual Clauses approved by the European Commission or other legally recognized transfer mechanisms. By using our services, you consent to such international transfers of your data.' },
			],
		},
		{
			level: 2,
			heading: 'Third-Party Services',
			blocks: [
				{ kind: 'p', text: 'Our website and services may contain links to third-party websites or services. We are not responsible for the privacy practices of these external sites. We encourage you to read the privacy policies of any third-party sites you visit.' },
				{ kind: 'p', text: 'We use third-party services including Google Analytics for website analytics, email service providers for newsletter distribution, social media platforms for content sharing, payment processors for fee processing, communication platforms for member community features, and event management platforms for organizing member events.' },
				{ kind: 'p', text: 'For benchmark surveys, we use Fillout as our survey platform provider. Fillout processes survey response data on our behalf under a data processing agreement and in compliance with GDPR.' },
			],
		},
		{
			level: 2,
			heading: 'Children\'s Privacy',
			blocks: [
				{ kind: 'p', text: 'Neither our website nor our services are directed at individuals under the age of 18. We do not knowingly collect personal data from children. If we learn that we have collected personal data from a child under 18, we will take appropriate steps to delete such data. Playmakers membership is available only to founders and executives who meet our professional criteria.' },
			],
		},
		{
			level: 2,
			heading: 'Changes to This Policy',
			blocks: [
				{ kind: 'p', text: 'We may update this privacy policy from time to time. Any changes will be posted on this page with an updated revision date. For Playmakers members, we will notify you of material changes via email to your registered email address. We encourage you to review this policy periodically.' },
			],
		},
		{
			level: 2,
			heading: 'Contact Us',
			blocks: [
				{ kind: 'p', text: 'If you have any questions about this privacy policy or our data practices, including questions about Playmakers membership data or Sports Tech VC Deal Sourcing Benchmark Study participation, please contact us at:' },
				{ kind: 'p', label: 'General inquiries:', text: '' },
				{ kind: 'p', label: 'Email:', text: 'hello@sportstechx.com' },
				{ kind: 'p', label: 'Address:', text: 'SportsTechX GmbH, Liebigstraße 35, 10247 Berlin, Germany' },
				{ kind: 'p', text: 'Last updated: April 8, 2026' },
			],
		},
	],
};
