import fs from 'fs';
import path from 'path';

const srcPath = 'C:\\Users\\ACER\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\History';
const destPath = './scratch/History_copy';

// Ensure scratch dir exists
if (!fs.existsSync('./scratch')) {
  fs.mkdirSync('./scratch');
}

try {
  console.log('Copying Chrome History database...');
  fs.copyFileSync(srcPath, destPath);
  console.log('Copy successful.');

  const buffer = fs.readFileSync(destPath);
  const text = buffer.toString('utf8', 0, buffer.length);

  // 1. Find all emails in titles or URLs
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;
  const emails = new Set();
  let match;
  while ((match = emailRegex.exec(text)) !== null) {
    // Basic filter to ignore dummy domains
    const email = match[0].toLowerCase();
    if (!email.includes('example.com') && !email.includes('schema.org') && !email.includes('w3.org') && !email.includes('github.com')) {
      emails.add(email);
    }
  }

  console.log('\n--- UNIQUE EMAILS FOUND IN CHROME HISTORY ---');
  console.log(Array.from(emails));

  // 2. Find Supabase project URLs
  const supabaseRegex = /supabase\.com\/dashboard\/project\/[a-z]+/g;
  const projects = new Set();
  while ((match = supabaseRegex.exec(text)) !== null) {
    projects.add(match[0]);
  }

  console.log('\n--- SUPABASE PROJECT URL PATTERNS FOUND ---');
  console.log(Array.from(projects));

  // Clean up copy
  fs.unlinkSync(destPath);
} catch (err) {
  console.error('Error analyzing history:', err);
}
