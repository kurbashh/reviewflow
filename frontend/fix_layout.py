import re

with open('src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. We need to extract the Recent Reviews section
recent_reviews_match = re.search(r'\{/\* Recent Reviews Summary \*/\}(.*?)</section>', content, re.DOTALL)
if not recent_reviews_match:
    print("Could not find Recent Reviews section")
    exit(1)

recent_reviews_content = recent_reviews_match.group(1).strip()
# Remove <section className="mt-8"> wrapper
recent_reviews_content = re.sub(r'^<section className="mt-8">\s*', '', recent_reviews_content)
recent_reviews_content = re.sub(r'\s*$', '', recent_reviews_content)

# 2. We need to remove the bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-[var(--border-subtle)] from Recent Reviews
recent_reviews_content = recent_reviews_content.replace(
    'bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-[var(--border-subtle)]',
    ''
)

# 3. We need to build the new grid
new_grid = f"""{{/* Master Analytics Leaderboard & Recent Reviews */}}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
                  {{/* Left Column: Recent Reviews List */}}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    {recent_reviews_content}
                  </div>

                  {{/* Right Column: Master Analytics Leaderboard */}}
                  <div className="lg:col-span-5">
                    {{masters.length > 0 && (
                      <section className="rounded-card bg-[var(--surface)] shadow-sm p-6 sm:p-8">"""

# 4. Replace the start of masters block with the new grid
content = content.replace(
    """{/* Master Analytics Leaderboard */}
                {masters.length > 0 && (
                  <section className="rounded-card bg-[var(--surface)] shadow-sm p-6 sm:p-8">""",
    new_grid
)

# 5. Remove the old Recent Reviews block completely
content = re.sub(r'\n\s*\{/\* Recent Reviews Summary \*/\}.*?</section>', '\n                  </div>\n                </div>', content, flags=re.DOTALL)

with open('src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
