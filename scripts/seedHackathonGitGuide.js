const { pool, query } = require('../src/db');

const SPACE_NAME = 'Hackathon Guides';
const SPACE_DESCRIPTION =
  'Practical workflow and architecture guides for Mini Project hackathon preparation.';

function lines(items) {
  return items.join('\n');
}

const GIT_GUIDE_TITLE = 'Hackathon Git Guide';
const GIT_GUIDE_OLD_TITLES = ['Hackathon Git 使用指南'];
const GIT_GUIDE_CONTENT = lines([
  '# Hackathon Git Guide',
  '',
  '## 1. Basic Workflow Overview',
  '',
  'Before writing code, confirm the repository, branch, and working tree state. COMP2100/COMP6442 Mini Project marking often depends on a week branch or another specified branch, not always `main`.',
  '',
  'Core habits:',
  '- Check the branch before changing files.',
  '- Fetch or pull before starting work.',
  '- Use a task branch when the change is risky or shared.',
  '- Commit small, reviewable changes.',
  '- Push the correct branch.',
  '- Confirm the CI or marking branch from the course instructions.',
  '',
  '```bash',
  'git status',
  'git branch',
  'git fetch --all',
  'git pull',
  '```',
  '',
  '## 2. Cloning the Project',
  '',
  'Clone the repository from the course or group URL, then move into the project directory before running Git commands.',
  '',
  '```bash',
  'git clone <repo-url>',
  'cd <project-folder>',
  '```',
  '',
  'Common problems:',
  '- You are in the wrong folder and `git status` says `not a git repository`.',
  '- You do not have repository permission.',
  '- Your SSH key is not configured.',
  '- HTTPS access requires a token instead of an account password.',
  '',
  'Useful checks:',
  '',
  '```bash',
  'pwd',
  'ls',
  'git remote -v',
  'git status',
  '```',
  '',
  '## 3. Viewing and Switching Branches',
  '',
  'Inspect local and remote branches before switching. A course project may use `main`, `week-8`, `week-9`, or task-specific branches.',
  '',
  '```bash',
  'git branch',
  'git branch -a',
  'git checkout main',
  'git checkout week-8',
  'git switch week-8',
  '```',
  '',
  'If Git reports this error:',
  '',
  '```text',
  "pathspec 'week-8' did not match any file(s) known to git",
  '```',
  '',
  'the branch usually exists only on the remote. Fetch first, then create a local branch that tracks the remote branch.',
  '',
  '```bash',
  'git fetch origin',
  'git checkout -b week-8 origin/week-8',
  '```',
  '',
  '## 4. Creating a New Branch',
  '',
  'If the hackathon instructions do not require direct commits to a week branch, create a feature branch from the correct starting branch.',
  '',
  '```bash',
  'git checkout -b feature/my-task',
  'git push -u origin feature/my-task',
  '```',
  '',
  'Use a feature branch when multiple people are editing, the task is large, or you want to keep the marking branch clean until the feature is ready. If the submission must land on `week-8`, merge or cherry-pick the finished work back to `week-8` before the deadline.',
  '',
  '## 5. Pulling Upstream or Course Starter Updates',
  '',
  'Some course starter repositories receive updates during the project. If an `upstream` remote exists, fetch and merge from the relevant branch.',
  '',
  '```bash',
  'git remote -v',
  'git fetch upstream',
  'git merge upstream/week-8',
  '```',
  '',
  'If `upstream` is missing, add it once, then fetch.',
  '',
  '```bash',
  'git remote add upstream <upstream-url>',
  'git fetch upstream',
  '```',
  '',
  'Common problems:',
  '- `upstream not found`: the remote was not added or has a different name.',
  '- Merge conflicts: your branch and the starter update changed the same lines.',
  '- Git opens an editor for the merge commit message.',
  '',
  '## 6. Handling Merge Commit Messages and vi',
  '',
  'After a merge, Git may open vi with a `MERGE_MSG` buffer. This is not a crash. Git is asking you to confirm the merge commit message.',
  '',
  'Save and exit:',
  '',
  '```bash',
  'Esc',
  ':wq',
  'Enter',
  '```',
  '',
  'Exit without saving:',
  '',
  '```bash',
  'Esc',
  ':q!',
  'Enter',
  '```',
  '',
  'You can also provide the message explicitly:',
  '',
  '```bash',
  'git commit -m "Merge upstream/week-8 into week-8"',
  '```',
  '',
  '## 7. Resolving Merge Conflicts',
  '',
  'Start by checking which files are conflicted.',
  '',
  '```bash',
  'git status',
  '```',
  '',
  'Conflict markers look like this:',
  '',
  '```text',
  '<<<<<<< HEAD',
  'your version',
  '=======',
  'incoming version',
  '>>>>>>> branch',
  '```',
  '',
  'Edit the file, keep the correct final content, remove every conflict marker, then stage and commit the resolved file.',
  '',
  '```bash',
  'git add <file>',
  'git commit',
  '```',
  '',
  'If you are resolving conflicts during a rebase, continue the rebase after staging the fixed files.',
  '',
  '```bash',
  'git rebase --continue',
  '```',
  '',
  'Abort the current merge or rebase only if you need to return to the previous state.',
  '',
  '```bash',
  'git merge --abort',
  'git rebase --abort',
  '```',
  '',
  'Common conflict files in Mini Project work include `Integrity.md`, `.DS_Store`, Java source files, test files, and Android XML layouts.',
  '',
  '## 8. The .DS_Store Problem',
  '',
  '`.DS_Store` is a macOS Finder metadata file. It is usually not meaningful source code and can create noisy conflicts.',
  '',
  '```bash',
  'find . -name ".DS_Store" -delete',
  'echo ".DS_Store" >> .gitignore',
  'git rm --cached .DS_Store',
  'git add .gitignore',
  'git commit -m "Ignore macOS DS_Store files"',
  '```',
  '',
  'If `.DS_Store` is tracked in several folders, list the files first and remove each tracked copy from Git.',
  '',
  '```bash',
  'find . -name ".DS_Store" -print',
  'git rm --cached path/to/.DS_Store',
  '```',
  '',
  '## 9. Detached HEAD and Rebase States',
  '',
  'Messages such as `You are not currently on a branch` or `no branch, rebasing main` usually mean you checked out a commit directly or a rebase is incomplete. Do not run a destructive reset as your first response.',
  '',
  '```bash',
  'git status',
  'git branch',
  'git switch week-8',
  'git rebase --continue',
  'git rebase --abort',
  '```',
  '',
  'If you have uncommitted work, save it before switching branches.',
  '',
  '```bash',
  'git stash',
  'git switch week-8',
  'git stash pop',
  '```',
  '',
  '## 10. Push Errors and Upstream Mismatch',
  '',
  'A common push error is:',
  '',
  '```text',
  'The upstream branch of your current branch does not match',
  '```',
  '',
  'Push the current commit to a branch with the same name:',
  '',
  '```bash',
  'git push origin HEAD',
  'git push -u origin HEAD',
  '```',
  '',
  'Push the current branch to a differently named remote branch:',
  '',
  '```bash',
  'git push origin HEAD:feature/hackathon-tests',
  '```',
  '',
  '`git push origin HEAD` means push the current checked-out commit. `git push -u origin HEAD` also sets the upstream branch, so future `git push` commands know where to send commits.',
  '',
  '## 11. Good Commit Habits',
  '',
  'Review changes before staging. Prefer adding specific files over blindly staging everything.',
  '',
  '```bash',
  'git status',
  'git diff',
  'git add <file>',
  'git commit -m "Implement PostKeywordIndex"',
  'git log --oneline --graph --decorate -10',
  '```',
  '',
  'Good commit messages:',
  '- Implement DS01 Post keyword index',
  '- Add tests for AVL slice edge cases',
  '- Fix CSV escaping for quoted fields',
  '',
  'Weak commit messages:',
  '- update',
  '- stuff',
  '- final final',
  '',
  '## 12. CI and GitLab Pipeline Checks',
  '',
  'CI may run on `main`, while marking may inspect a week branch. Do not assume that passing CI on one branch proves the submitted branch is correct.',
  '',
  '```bash',
  'git push',
  '```',
  '',
  'Common CI messages:',
  '- `This pipeline is run on the main branch...`',
  '- `class not found`',
  '- `test failed`',
  '- `compile failed`',
  '',
  'Checklist:',
  '- The correct branch was pushed.',
  '- Files are in the expected folder.',
  '- Test class names match their file names.',
  '- Package declarations match the source folder.',
  '- Relevant code compiles locally, or relevant tests run locally.',
  '',
  '## 13. Java Compile and Test Errors',
  '',
  'Common Java errors:',
  '- `cannot find symbol`: method, class, variable, import, or package is wrong.',
  '- `package does not exist`: classpath or package declaration is wrong.',
  '- `class not found`: output folder, test class name, or run command is wrong.',
  '- `wrong package declaration`: package line does not match the folder.',
  '- `JUnit import missing`: the test cannot find the JUnit jar.',
  '',
  '```bash',
  'javac',
  './gradlew test',
  './gradlew :app:assembleDebug',
  '```',
  '',
  'If the project uses local JUnit jars:',
  '',
  '```bash',
  'javac -cp "lib/junit-4.13.jar:lib/hamcrest-core-1.3.jar:src:test" ...',
  '```',
  '',
  '## 14. Android and Gradle Issues',
  '',
  'Common Android or Gradle issues include an unsupported JDK target, a missing resource id, a manifest activity mismatch, or an XML id that no longer matches Java or Kotlin references.',
  '',
  '```bash',
  './gradlew clean',
  './gradlew :app:assembleDebug',
  '```',
  '',
  'If dependency downloads fail, check the network, proxy, Gradle wrapper, and Android SDK configuration.',
  '',
  '## 15. Hackathon Submission Checklist',
  '',
  '- Correct branch selected.',
  '- All required files committed.',
  '- No unresolved conflicts.',
  '- No `.DS_Store` files staged.',
  '- Code compiles.',
  '- Tests pass or known failures are documented.',
  '- Task files are named correctly.',
  '- UML diagrams or screenshots are included if required.',
  '- `Integrity.md` is resolved and committed.',
  '',
  '```bash',
  'git status',
  'git log --oneline -5',
  'git push',
  '```',
  '',
  'If `git status` is not clean, decide whether each modified or untracked file must be committed, ignored, or removed.',
  '',
  '## 16. Emergency Recovery',
  '',
  'Use reflog before assuming work is lost. Reflog usually records recent positions of `HEAD`.',
  '',
  '```bash',
  'git reflog',
  'git checkout <commit>',
  'git checkout -b recovery-branch',
  'git stash list',
  'git stash pop',
  '```',
  '',
  'Recovery plan:',
  '- Find the lost commit hash.',
  '- Check out that commit.',
  '- Create a recovery branch to protect it.',
  '- Merge or cherry-pick the recovered work back to the correct branch.',
  '',
  '## 17. Quick Command Cheat Sheet',
  '',
  '```bash',
  'git status',
  'git branch',
  'git branch -a',
  'git fetch --all',
  'git pull',
  'git checkout -b feature/my-task',
  'git switch week-8',
  'git add <file>',
  'git commit -m "Implement task"',
  'git push origin HEAD',
  'git push -u origin HEAD',
  'git log --oneline --graph --decorate -10',
  'git diff',
  'git stash',
  'git stash pop',
  'git merge --abort',
  'git rebase --continue',
  'git rebase --abort',
  'git reflog',
  'find . -name ".DS_Store" -delete',
  '```',
  '',
  'The safest rhythm is: run `git status`, understand the state, then choose the next command.',
]);

const CODEBASE_GUIDE_TITLE = 'MiniLab Codebase Review and Coding Guide';
const CODEBASE_GUIDE_OLD_TITLES = [
  'MiniLab Censor Module Analysis and Coding Guide',
];
const CODEBASE_GUIDE_CONTENT = lines([
  '# MiniLab Codebase Review and Coding Guide',
  '',
  '## Scope',
  '',
  'This guide reviews the whole imported COMP2100 MiniLab application codebase and gives practical coding instructions for future changes. It covers the original MiniLab source under `imports/app/src`, useful original tests under `imports/app/test`, and the website import/context rules that keep those files available for browsing, search, symbol indexing, and implementation reference.',
  '',
  'Base codebase context should include all normal MiniLab source packages, including `dao`, `dao/model`, `sorteddata`, `persistentdata`, `userstate`, and `censor`. Exclude `src/Mock_hackathon`, `test/Mock_hackathon`, Notes, Documentation, To-do, Git Simulator, and website manager/auth/frontend/backend code.',
  '',
  '## Package Map',
  '',
  '- `dao/model`: domain records and model contracts such as `User`, `Post`, `Message`, `Role`, and `HasUUID`.',
  '- `dao`: data access classes that store and retrieve model objects, including `DAO`, `UserDAO`, `PostDAO`, comparators, and random content helpers.',
  '- `sorteddata`: collection abstraction and sorted collection implementations, including AVL tree, BST, sorted array list, iterators, slices, and factories.',
  '- `persistentdata`: save/load coordination through `DataManager`, data pipelines, serializers, formatted readers/writers, and IO factories.',
  '- `userstate`: application state flow for guest, member, admin, and state manager behaviour.',
  '- `censor`: message filtering API and implementation for profanity masking, blocking, case-sensitive matching, and special word variants.',
  '- `test`: original test files that show expected DAO, sorted data, persistence, and user-state behaviour.',
  '- `Mock_hackathon`: practice/generated hackathon catalogue. Keep it separate from the base MiniLab review unless the task explicitly asks about mock hackathon content.',
  '',
  '## Architecture Flow',
  '',
  '1. User interaction enters through `userstate` classes such as `StateManager`, `GuestState`, `MemberState`, and `AdminState`.',
  '2. State classes call DAO services instead of directly mutating storage.',
  '3. `UserDAO` and `PostDAO` extend the shared `DAO<T extends HasUUID>` abstraction and store model objects in `SortedData` implementations.',
  '4. `sorteddata` provides interchangeable collection implementations. The default sorted structure is usually selected through a factory rather than constructed everywhere by hand.',
  '5. `persistentdata` coordinates reading and writing objects through pipelines, serializers, format factories, and IO factories.',
  '6. Optional message text processing can pass through `censor` before message content is stored or displayed.',
  '7. Tests exercise these layers by checking DAO singleton behaviour, iteration, serialization, sorted-data efficiency, and user-state transitions.',
  '',
  '```mermaid',
  'flowchart TD',
  '  UserState[User State Layer] --> DAO[DAO Layer]',
  '  DAO --> Model[Domain Model Layer]',
  '  DAO --> SortedData[Sorted Data Layer]',
  '  DAO --> Persistence[Persistence Layer]',
  '  Persistence --> Files[CSV or Local Files]',
  '  UserState --> Censor[Censor Module]',
  '  Tests[Original Tests] --> DAO',
  '  Tests --> SortedData',
  '  Tests --> Persistence',
  '```',
  '',
  '## Structure Review',
  '',
  'The codebase has a clear teaching-oriented layered structure. The model package defines simple domain objects, DAOs centralise access, sorted data structures are abstracted behind interfaces, persistence is split into serializers/readers/writers, and user-state classes isolate role-specific behaviour. This is a good foundation for COMP2100 because each major design idea is visible in a separate package.',
  '',
  'The strongest design point is the separation between model data and storage mechanics. `Post`, `Message`, and `User` do not need to know whether data is stored in an AVL tree, a sorted array list, or a CSV file. That separation makes it possible to test algorithms and persistence independently.',
  '',
  'The main risk is global/shared state. Singleton DAOs and state managers are convenient in a small teaching project, but they make tests order-sensitive if data is not cleared between cases. Any new feature that touches `UserDAO`, `PostDAO`, `DataManager`, or `StateManager` should include reset/clear setup in tests.',
  '',
  'The second risk is hidden coupling through comparators, UUIDs, timestamps, and CSV column order. When changing model fields or serializer formats, update the model, serializer, deserializer, tests, and sample files together. Do not change one side of the pipeline only.',
  '',
  'The third risk is mixing original MiniLab source with hackathon practice code. Keep `Mock_hackathon` separate from the base architecture context. Practice files can be useful examples, but they should not redefine how the original MiniLab packages work.',
  '',
  '## Coding Rules',
  '',
  '- Preserve Java package declarations and folder paths. A file declaring `package dao.model;` belongs in `src/dao/model`, and a file declaring `package censor;` belongs in `src/censor`.',
  '- Add one concise `//` comment directly above every new method or constructor. Comments should explain intent without restating obvious syntax.',
  '- Prefer existing package patterns before adding a new abstraction. Match how DAOs, serializers, factories, and sorted-data implementations are already written.',
  '- Keep public APIs small. Use package-private helper classes and methods unless another package genuinely needs direct access.',
  '- Do not mutate model identity fields such as UUIDs after insertion into sorted data or DAO indexes.',
  '- Keep comparator logic stable. If object ordering changes, check all sorted structures, iterator behaviour, and tests that rely on ordering.',
  '- Avoid destructive data scripts on deployed systems. Import, enrich, and index codebase topics without dropping or resetting production data.',
  '- Do not edit `src/Mock_hackathon` or `test/Mock_hackathon` when the task is about the real MiniLab codebase.',
  '',
  '## DAO Instructions',
  '',
  '- Put object lookup and collection mutation in DAO classes, not in user-state or persistence code.',
  '- Keep DAO methods consistent with `DAO<T extends HasUUID>` expectations: add, get, clear, getAll, and random access should respect the stored sorted data structure.',
  '- Clear DAO singleton state before tests that depend on a clean dataset.',
  '- When adding a new domain object, create a model class or record first, then create DAO behaviour, then add persistence only if the object must survive reloads.',
  '- Keep random content generation separate from core DAO logic so tests can stay deterministic.',
  '',
  '## Model Instructions',
  '',
  '- Model classes should represent data and simple invariants. Avoid adding persistence, UI, or state-machine responsibilities to model records/classes.',
  '- Keep UUID ownership explicit. Classes implementing `HasUUID` should return the stable identity used by DAOs and sorted collections.',
  '- When adding fields to `User`, `Post`, or `Message`, update constructors/records, serializers, equality expectations, tests, and any sample data.',
  '- Keep timestamp formatting helpers separate from timestamp storage.',
  '',
  '## Sorted Data Instructions',
  '',
  '- Use the `SortedData` abstraction where callers do not need a specific implementation.',
  '- Use factories when the project already selects a default data structure through factory code.',
  '- For AVL and BST changes, test empty tree, single node, duplicate ordering, insertion order, iterator order, range/slice behaviour, and removal edge cases.',
  '- Keep iterator behaviour deterministic. If traversal order changes, update tests and documentation together.',
  '- State time complexity clearly for add, search/get, iteration, slicing, and removal.',
  '',
  '## Adding Data Structure Code',
  '',
  'First decide whether the task belongs in the real MiniLab implementation or in the mock hackathon catalogue. Real reusable structures belong under `src/sorteddata` or the package that will consume them. Practice catalogue tasks belong under `src/Mock_hackathon/DataStructures` with matching tests under `test/Mock_hackathon/DataStructures`.',
  '',
  'Implementation steps:',
  '',
  '1. Define the responsibility in one sentence before coding. Examples: inverted keyword index, timestamp range index, trending heap, follow graph, trie autocomplete, LRU cache, undo stack, or rate-limit sliding window.',
  '2. Choose the minimum data structure that directly supports the required operations. Use `Map` plus `Set` for indexes, heap/priority queue for top item selection, tree/range structure for ordered slices, queue/deque for windows, stack for undo/history, trie for prefix search, and graph adjacency maps for relationship traversal.',
  '3. Keep fields private unless the existing package pattern requires package visibility for tests. Expose behaviour through named methods, not direct collection access.',
  '4. Use stable identity types. Most MiniLab domain indexes should use `UUID` keys rather than full mutable objects.',
  '5. Normalize keys consistently. Text indexes should lower-case, trim, split/tokenize, and handle null or blank input through one helper method.',
  '6. Return defensive copies or unmodifiable views when exposing internal collections.',
  '7. Document every public method with JavaDoc. Include what the method changes, what it returns, and how null/empty input is handled.',
  '8. State expected complexity in comments or documentation for the important operations. For example, hash index lookup is usually O(1) average per key, trie prefix search is O(p + r), heap insert/remove is O(log n), and graph BFS is O(V + E).',
  '',
  'Typical method set for index-like structures:',
  '',
  '```java',
  'public void addItem(UUID itemId, String text)',
  'public boolean removeItem(UUID itemId)',
  'public Set<UUID> search(String key)',
  'public Set<UUID> searchAll(Collection<String> keys)',
  'public int frequency(String key)',
  'public int itemCount()',
  '```',
  '',
  'Typical method set for ordering/ranking structures:',
  '',
  '```java',
  'public void addOrUpdate(UUID itemId, int score)',
  'public boolean remove(UUID itemId)',
  'public Optional<UUID> peekTop()',
  'public List<UUID> topK(int limit)',
  'public int size()',
  'public boolean isEmpty()',
  '```',
  '',
  'Typical method set for graph structures:',
  '',
  '```java',
  'public void addNode(UUID id)',
  'public void addEdge(UUID from, UUID to)',
  'public boolean removeEdge(UUID from, UUID to)',
  'public Set<UUID> neighboursOf(UUID id)',
  'public boolean hasPath(UUID from, UUID to)',
  'public List<UUID> shortestPath(UUID from, UUID to)',
  '```',
  '',
  'Common mistakes to avoid:',
  '',
  '- Do not return the internal `HashMap`, `HashSet`, `PriorityQueue`, or node map directly.',
  '- Do not let duplicates corrupt counts. If an item is re-added with new text, remove old index entries before inserting new ones.',
  '- Do not make iteration order accidental. Use `LinkedHashSet`, sorted lists, or explicit comparators when the test expects stable order.',
  '- Do not silently accept invalid limits such as negative `topK`; either return empty results or throw `IllegalArgumentException`, then test that behaviour.',
  '- Do not use static mutable state unless the task explicitly asks for a singleton or shared registry.',
  '',
  '## Data Structure Test Cases',
  '',
  'Each new data structure should have a focused JUnit test file beside the matching package. For mock hackathon tasks, `DS01_PostKeywordIndex.java` should pair with `DS01_PostKeywordIndexTest.java`, and the package line should be `package Mock_hackathon.DataStructures;` in both files.',
  '',
  'Minimum test coverage:',
  '',
  '- Empty structure: search/peek/remove on empty data returns the documented value.',
  '- Single item: add one item and verify lookup, size, and returned identity.',
  '- Multiple items: verify independent keys, shared keys, and stable result ordering when relevant.',
  '- Duplicate/update path: add the same UUID again and confirm old index entries or scores are replaced correctly.',
  '- Removal path: remove existing and missing items, then verify indexes and counts are clean.',
  '- Edge input: null text, blank text, mixed case, punctuation, repeated words, negative limits, zero limits, unknown IDs.',
  '- Defensive copy: mutate the returned collection in the test and confirm the internal structure is not changed.',
  '- Algorithm-specific behaviour: heap top order, graph reachability, trie prefix matches, range boundaries, cache eviction, sliding-window expiry.',
  '',
  'Recommended JUnit shape:',
  '',
  '```java',
  'public class DS##_FeatureNameTest {',
  '    private DS##_FeatureName structure;',
  '',
  '    @Before',
  '    public void setUp() {',
  '        structure = new DS##_FeatureName();',
  '    }',
  '',
  '    @Test',
  '    public void addThenSearchReturnsInsertedId() {',
  '        UUID id = UUID.randomUUID();',
  '        structure.addItem(id, \"hello world\");',
  '        assertTrue(structure.search(\"hello\").contains(id));',
  '    }',
  '}',
  '```',
  '',
  'Tests should assert behaviour, not implementation details. Do not check private field names or exact internal map types unless the task specifically asks for that data structure.',
  '',
  '## Adding Design Pattern Code',
  '',
  'Design pattern tasks should make the pattern roles visible without overbuilding. In real MiniLab source, place the pattern near the package it supports. In mock hackathon practice, place implementation files under `src/Mock_hackathon/DesignPatterns` and matching tests under `test/Mock_hackathon/DesignPatterns`.',
  '',
  'Pattern implementation guidance:',
  '',
  '- Strategy: create a strategy interface, at least two concrete strategies, and a context/service that accepts or switches strategies. Test that changing strategy changes behaviour without changing the context class.',
  '- Observer: create a subject with subscribe/unsubscribe/notify methods and observers with a small update method. Test multiple observers, removed observers, and event payload content.',
  '- Factory/Abstract Factory: keep construction rules in a factory and avoid scattered `new ConcreteType()` calls. Test correct concrete type and invalid option behaviour.',
  '- Adapter: wrap an incompatible legacy API behind the expected interface. Test that translated input/output matches the new interface contract.',
  '- Command: represent an action as an object with `execute`, and `undo` if required. Test execution order, receiver side effects, and undo/retry behaviour.',
  '- State: move state-specific behaviour into state classes. Test transitions and permission failures for each state.',
  '- Decorator: wrap an object with the same interface and add behaviour before/after delegation. Test base behaviour, single decorator, and stacked decorators.',
  '- Proxy: control access, caching, logging, or lazy loading around a real service. Test cache hits/misses or permission pass/fail cases.',
  '- Builder: use a builder when construction has many optional fields or validation rules. Test defaults, required fields, and invalid combinations.',
  '- Template Method: put the fixed algorithm in an abstract superclass and let subclasses override defined steps. Test that the algorithm order is stable and custom steps change only the intended part.',
  '- Composite: represent tree-like objects through a shared component interface. Test leaf, nested composite, traversal, and aggregate behaviour.',
  '- Iterator: expose traversal without exposing internal storage. Test empty, single, multiple, and no-such-element behaviour.',
  '- Specification: put validation/search predicates into composable objects. Test single specs, combined specs, negation, and boundary values.',
  '',
  'Every pattern file should name the pattern role in code or comments. For example, `FeedRankingStrategy` should make the Strategy interface obvious, and `ModerationCommand` should make the Command receiver/action relationship obvious.',
  '',
  '## Design Pattern Test Cases',
  '',
  'A design pattern test should prove both behaviour and structure. Behaviour means the feature works. Structure means the pattern role is actually being used instead of hard-coded branching in one method.',
  '',
  'Minimum test coverage by pattern type:',
  '',
  '- Strategy: two strategies produce different results from the same context input.',
  '- Observer: all subscribed observers receive the event; unsubscribed observers do not.',
  '- Factory: known keys create the right object; unknown keys follow the documented failure path.',
  '- Adapter: legacy format input is accepted through the new interface.',
  '- Command: execute changes receiver state; undo restores it when undo is part of the task.',
  '- State: illegal operation in one state is rejected and legal operation in another state succeeds.',
  '- Decorator: wrapped result includes base behaviour plus decoration, and multiple decorators compose in the expected order.',
  '- Proxy: the proxy delegates when allowed and blocks or caches when required.',
  '- Builder: complete build succeeds, missing required fields fail, defaults are applied.',
  '- Template Method: subclass hook changes a step while the surrounding algorithm stays the same.',
  '- Composite: nested children aggregate values or traversal results correctly.',
  '- Iterator: iteration visits each element exactly once and handles exhaustion.',
  '- Specification: individual and combined rules accept/reject the correct objects.',
  '',
  'Avoid tests that only check class names. A class named `SomethingStrategy` is not enough; the test should show that the strategy can be swapped and the context does not need to know the concrete implementation.',
  '',
  '## Persistence Instructions',
  '',
  '- Keep `DataManager` as the coordinator, not the serializer for every type.',
  '- Keep `DataPipeline` generic. Type-specific conversion belongs in serializer classes.',
  '- Keep formatted readers/writers responsible for row formatting only, not object construction.',
  '- Keep IO factories responsible for where files come from, not how domain objects are interpreted.',
  '- Treat CSV column order as a contract. If a column changes, update serializer, deserializer, fixture data, tests, and documentation.',
  '- Before production import or migration work, back up the database and `imports/app` folder.',
  '',
  '## Adding Persistent Data Code',
  '',
  'Persistent-data changes should be built as a pipeline, not as one large method. Decide the storage contract first, then update the serializer and coordinator. For real MiniLab source, use `src/persistentdata`, `src/persistentdata/serialization`, `src/persistentdata/formatted`, and `src/persistentdata/io`. For mock persistence tasks, use `src/Mock_hackathon/PersistentData_Mock` and matching tests under `test/Mock_hackathon/PersistentData_Mock`.',
  '',
  'Implementation steps:',
  '',
  '1. Define the data record shape. List each column/field, type, null policy, default value, and relationship to other IDs.',
  '2. Update or create the domain model before writing persistence code. Persistence should serialize known objects, not invent object structure.',
  '3. Add a serializer/deserializer for the type. It should convert between object and row/string representation only.',
  '4. Add formatted reader/writer support only when the file format changes. CSV escaping and row splitting belong in formatted classes, not serializers.',
  '5. Add IO factory behaviour only when the storage location or environment changes.',
  '6. Add `DataManager` coordination only after serializer and IO pieces are testable by themselves.',
  '7. Preserve load order. Users usually load before posts, posts before messages, and relationship records after the entities they reference.',
  '8. Decide missing-file and malformed-row policy. Either skip, default, collect errors, or throw; then write tests for the chosen policy.',
  '9. Keep writes atomic when possible. Write to a temporary file first, then replace the target file after a successful write.',
  '10. Never test against production or user data. Use temporary folders or in-memory sample rows.',
  '',
  'Serializer checklist:',
  '',
  '- Handles delimiters, quotes, commas, newlines, and empty strings.',
  '- Handles UUID and timestamp parsing errors deliberately.',
  '- Preserves field order exactly.',
  '- Does not access DAO singletons directly unless the existing serializer pattern already does so.',
  '- Documents every generated method or constructor with one concise `//` intent comment.',
  '',
  'Data manager checklist:',
  '',
  '- Clears or replaces existing DAO state only when the operation is documented to reload all data.',
  '- Does not partially mutate global state if a read fails halfway through, unless partial load is explicitly accepted.',
  '- Writes related files in a stable order.',
  '- Logs or exposes enough error information for malformed data to be diagnosed.',
  '',
  '## Persistent Data Test Cases',
  '',
  'Persistent-data tests should use temporary files/folders and small fixtures. Do not use the live `imports/app` data files as writable test targets.',
  '',
  'Minimum test coverage:',
  '',
  '- Serializer round trip: object -> row -> object preserves all fields.',
  '- Special characters: commas, quotes, blank fields, whitespace, and newlines are escaped/read correctly.',
  '- Missing file: loader follows the documented policy.',
  '- Malformed row: loader follows the documented skip/error/default policy.',
  '- Relationship resolution: messages attach to the correct post, users/posts/messages keep UUID references, and missing references are handled.',
  '- Load order: dependent records are loaded after parent records.',
  '- Atomic save: failed write does not destroy the previous valid file.',
  '- Batch save: multiple objects are written, then reloaded in a new clean manager/DAO state.',
  '- Version/schema header: if a version header exists, old/new versions are handled as documented.',
  '- Export/import: exported rows can be imported into a clean temporary directory.',
  '',
  'Recommended persistent test shape:',
  '',
  '```java',
  'public class PD##_FeaturePersistenceTest {',
  '    private Path tempDir;',
  '',
  '    @Before',
  '    public void setUp() throws IOException {',
  '        tempDir = Files.createTempDirectory(\"minilab-persistence-test\");',
  '    }',
  '',
  '    @Test',
  '    public void writeThenReadPreservesFields() throws IOException {',
  '        // create object, write it, clear state, read it back, assert fields',
  '    }',
  '}',
  '```',
  '',
  '## User State Instructions',
  '',
  '- Put role-specific command behaviour in the relevant state class.',
  '- Keep transitions through `StateManager` so login, logout, guest, member, and admin behaviour remain predictable.',
  '- Do not let UI or persistence code bypass state permissions.',
  '- Test guest/member/admin paths separately, including invalid login, logout, and permission failures.',
  '',
  '## Censor Instructions',
  '',
  '- Treat `src/censor` as a normal original MiniLab source package.',
  '- Use `ICensor` as the public contract for message filtering.',
  '- Keep shared matching/masking flow in `CensorFacade`; variants should override only word lists, case policy, or final output policy.',
  '- Preserve original-message indexes when normalizing text so masking modifies the displayed message correctly.',
  '- Add tests for null input, empty input, safe words, obfuscated characters, case sensitivity, repeated matches, and block-vs-mask behaviour.',
  '',
  '## Testing Checklist',
  '',
  '- Compile changed Java packages with `javac` or the project build tool before importing them into the website.',
  '- Run focused tests for the package you touched.',
  '- Run DAO tests after changing model identity, comparators, singleton behaviour, or sorted storage.',
  '- Run sorted-data tests after changing AVL, BST, array-list, iterators, slices, or factories.',
  '- Run persistence tests after changing serializers, formatted readers/writers, IO factories, or file schemas.',
  '- Run user-state tests after changing login, logout, roles, or permissions.',
  '- Run censor tests after changing normalization, matching, word lists, masking, or blocking.',
  '',
  '## Writing New Test Case Files',
  '',
  'Test files should mirror source files. A source file in `src/Mock_hackathon/DataStructures/DS10_TrendingPostHeap.java` should have a test in `test/Mock_hackathon/DataStructures/DS10_TrendingPostHeapTest.java`. A source file in `src/persistentdata/serialization/PostSerializer.java` should have a focused test near the original persistence tests or in the matching test package used by the project.',
  '',
  'Naming rules:',
  '',
  '- Test class name should be source class name plus `Test`.',
  '- Test method names should describe behaviour, such as `searchReturnsAllMatchingPostIds`, `removeMissingItemReturnsFalse`, or `malformedRowIsSkipped`.',
  '- Package declaration in the test must match the test folder and the source package convention.',
  '- Use `@Before` to create a clean structure, clean DAO state, or temporary directory for each test.',
  '',
  'Assertion rules:',
  '',
  '- Use exact assertions for IDs, counts, ordering, and returned values.',
  '- Use `assertTrue`, `assertFalse`, `assertEquals`, `assertNull`, `assertNotNull`, and `fail` deliberately. Avoid vague assertions that only check that no exception happened.',
  '- For collections, assert size and contents. If order matters, assert a `List`. If order does not matter, assert a `Set`.',
  '- For exceptions, use the JUnit 4 expected exception pattern already used by the project or explicit try/catch with `fail`.',
  '- For persistence tests, read back into a clean object/DAO state before asserting, so the test proves the file path works rather than the original in-memory object.',
  '',
  'Coverage matrix for each new task:',
  '',
  '| Area | Required cases |',
  '| --- | --- |',
  '| Constructor/default state | Empty size, empty search, empty iteration, default config |',
  '| Normal behaviour | Add/read/update/remove or execute expected operation |',
  '| Multiple objects | At least three objects so ordering and grouping bugs are visible |',
  '| Duplicate handling | Same ID/key/value inserted twice or updated |',
  '| Invalid input | Null, blank, missing ID, negative limit, malformed row, unknown type |',
  '| Boundary input | Zero limit, one item, first/last range, empty file, one-line file |',
  '| Side effects | DAO state, observer notifications, command receiver state, written files |',
  '| Regression risk | The bug most likely to happen in this implementation |',
  '',
  'Do not make tests depend on wall-clock time, random ordering, production files, or tests running in a specific order. If randomness is required, seed it or inject fixed data.',
  '',
  '## Website Import and Context Instructions',
  '',
  '- After changing imported MiniLab files, run `npm run import:codebase`, `npm run enrich:codebase`, and `npm run index:symbols`.',
  '- The importer should scan all normal folders under `imports/app/src` and original useful tests under `imports/app/test`.',
  '- The importer should ignore build artifacts, `.class` files, macOS metadata, and generated/non-code workspaces.',
  '- Base context should allow `src/dao`, `src/dao/model`, `src/sorteddata`, `src/persistentdata`, `src/userstate`, `src/censor`, and normal original tests.',
  '- Base context should exclude `src/Mock_hackathon`, `test/Mock_hackathon`, Notes, Documentation, To-do, Git Simulator, and website manager/auth code.',
  '- Search and symbols should include file names, package declarations, class/interface/enum/record declarations, public methods, fields, and code text.',
  '',
  '## Safe Production Workflow',
  '',
  'Use this sequence for VPS work. Adapt only the restart command to the detected process manager.',
  '',
  '```bash',
  'pg_dump "$DATABASE_URL" > backup_before_codebase_change.sql',
  'tar -czf imports_app_backup_before_codebase_change.tar.gz imports/app',
  'npm install',
  'npm run migrate',
  'npm run import:codebase',
  'npm run enrich:codebase',
  'npm run index:symbols',
  'cd frontend',
  'npm install',
  'npm run build',
  'pm2 startOrReload ecosystem.config.cjs --update-env',
  '```',
  '',
  'Never use `DROP DATABASE`, `db:setup`, destructive reset scripts, or broad delete commands against production data unless a human explicitly asks for that operation and a verified backup exists.',
  '',
  '## Review Checklist',
  '',
  '- Does the change belong in the original MiniLab codebase or in Mock_hackathon practice code?',
  '- Are package declarations and folders aligned?',
  '- Did every new generated method get a useful method comment?',
  '- Are public APIs minimal and consistent with existing package style?',
  '- Are DAO singleton side effects reset in tests?',
  '- Are sorted-data ordering and iterator contracts preserved?',
  '- Are serializers and file formats updated together?',
  '- Are role/state transitions still enforced through `userstate`?',
  '- Are censor changes tested against normal, edge, and obfuscated text?',
  '- Did the website import, enrichment, and symbol indexing run after codebase changes?',
  '- Is Mock_hackathon still excluded from base codebase browsing context?',
]);

const ARCHITECTURE_GUIDE_TITLE = 'MiniLab UML and Software Architecture Guide';

const PUML_DIAGRAMS = [
  {
    title: 'Software Architecture - MiniProject',
    source: '00-software-architecture.puml',
    description:
      'Use this component-style diagram when explaining the whole original MiniLab backend architecture across state, DAO, model, sorted data, persistence, and optional censor packages.',
    code: `@startuml
title Software Architecture - MiniProject

skinparam packageStyle rectangle
skinparam componentStyle rectangle

package "User Interaction / Application Layer" {
  [StateManager]
  [UserState]
  [GuestState]
  [MemberState]
  [AdminState]
}

package "Censor Module" {
  [ICensor]
  [CensorUsageDemo]
  [CensorFacade]
  [NormalizedMessage]
  [MatchFinder]
  [TextMasker]
}

package "Data Access Layer" {
  [DAO]
  [UserDAO]
  [PostDAO]
  [MessageComparator]
}

package "Domain Model Layer" {
  [User]
  [Post]
  [Message]
  [Role]
  [HasUUID]
}

package "Sorted Data Structure Layer" {
  [SortedData]
  [SortedDataFactory]
  [AVLTree]
  [AVLNode]
  [AVLIterator]
  [AVLTreeSlice]
  [BSTree]
  [SortedArrayList]
  [KeyIndexedSort]
}

package "Persistence Layer" {
  [DataManager]
  [DataPipeline]
  [Serializer]
  [UserSerializer]
  [PostSerializer]
  [MessageSerializer]
  [CSVFormattedFactory]
  [CSVReader]
  [CSVWriter]
  [IOFactory]
  [ComputerIOFactory]
}

database "CSV Files" as CSV

' Application / state flow
[StateManager] --> [UserState]
[UserState] <|-- [GuestState]
[UserState] <|-- [MemberState]
[MemberState] <|-- [AdminState]

' User actions
[GuestState] --> [UserDAO] : login/register
[MemberState] --> [PostDAO] : create posts/replies
[MemberState] --> [Post] : adds messages

' Optional censor module
[CensorFacade] ..|> [ICensor]
[CensorUsageDemo] ..> [ICensor] : creates variants
[CensorFacade] --> [NormalizedMessage]
[CensorFacade] --> [MatchFinder]
[CensorFacade] --> [TextMasker]
[MemberState] ..> [ICensor] : censor message text

' DAO layer
[DAO] <|-- [UserDAO]
[DAO] <|-- [PostDAO]
[UserDAO] --> [User]
[PostDAO] --> [Post]
[PostDAO] --> [Message]
[PostDAO] --> [MessageComparator]

' Domain model
[User] ..|> [HasUUID]
[Post] ..|> [HasUUID]
[Post] *-- [Message]
[User] --> [Role]

' Data structures
[DAO] --> [SortedData] : stores data in
[SortedDataFactory] --> [AVLTree] : creates default structure
[SortedData] <|-- [AVLTree]
[SortedData] <|-- [BSTree]
[SortedData] <|-- [SortedArrayList]
[AVLTree] *-- [AVLNode]
[AVLTree] --> [AVLIterator]
[AVLTree] --> [AVLTreeSlice]
[KeyIndexedSort] --> [AVLTreeSlice]


' Persistence
[DataManager] --> [UserDAO]
[DataManager] --> [PostDAO]
[DataManager] --> [DataPipeline]

[DataPipeline] --> [Serializer]
[Serializer] <|-- [UserSerializer]
[Serializer] <|-- [PostSerializer]
[Serializer] <|-- [MessageSerializer]

[DataPipeline] --> [CSVFormattedFactory]
[CSVFormattedFactory] --> [CSVReader]
[CSVFormattedFactory] --> [CSVWriter]

[DataPipeline] --> [IOFactory]
[IOFactory] <|-- [ComputerIOFactory]
[ComputerIOFactory] --> CSV

@enduml`,
  },
  {
    title: 'Overview Class Diagram',
    source: '01-overview-class-diagram.puml',
    description:
      'Use this class diagram when the marker needs to see domain models, DAO inheritance, key public methods, and the core DAO-to-sorted-data relationship.',
    code: `@startuml
' Overview class diagram generated from miniproject/app/src
skinparam packageStyle rectangle
skinparam classAttributeIconSize 0
hide empty members

title MiniProject - Overview Class Diagram

package "dao.model" {
  interface HasUUID {
    +getUUID(): UUID
  }

  record User {
    +id: UUID
    +role: Role
    +username: String
    +password: String
    +getUUID(): UUID
  }

  enum Role {
    Member
    Admin
  }

  record Message {
    +id: UUID
    +poster: UUID
    +thread: UUID
    +timestamp: long
    +message: String
  }

  class Post {
    +id: UUID
    +poster: UUID
    +topic: String
    +messages: SortedData<Message>
    +getUUID(): UUID
  }
}

package dao {
  abstract class DAO<T extends HasUUID> {
    #comparator: Comparator<T>
    #data: SortedData<T>
    +get(element: T): T
    +add(element: T): boolean
    +clear(): void
    +getAll(): Iterator<T>
    +getRandom(): T
  }

  class UserDAO {
    +getInstance(): UserDAO
    +login(username: String, password: String): User
    +register(username: String, password: String): User
    +getByUUID(id: UUID): User
  }

  class PostDAO {
    +getInstance(): PostDAO
    +getAtIndex(i: int): Post
    +getAllMessages(): Iterator<Message>
  }

  class MessageComparator {
    -instance: MessageComparator
    +getInstance(): MessageComparator
    +compare(o1: Message, o2: Message): int
  }

  class RandomContentGenerator
}

HasUUID <|.. User
HasUUID <|.. Post
DAO <|-- UserDAO
DAO <|-- PostDAO
Post "1" *-- "many" Message : messages
DAO --> SortedData : data
PostDAO --> Post
UserDAO --> User
@enduml`,
  },
  {
    title: 'SortedData / AVL Implementation',
    source: '02-sorteddata-avl-diagram.puml',
    description:
      'Use this package-specific diagram for data-structure questions. It separates the sorted-data abstraction from AVL, BST, and sorted-array-list implementations.',
    code: `@startuml
skinparam packageStyle rectangle
skinparam classAttributeIconSize 0
hide empty members

title SortedData / AVL Implementation

package sorteddata {
  abstract class SortedData<T> {
    +insert(value: T): boolean
    +get(value: T): T
    +getAtIndex(i: int): T
    +getRange(start: T, count: int, backwards: boolean): Iterator<T>
    +getRandom(): T
  }

  interface SortedDataSubject<T>
  interface SortedDataSlice<T> {
    +getResult(): List<T>
    +shiftBackward(distance: int): int
    +shiftForward(distance: int): int
    +onAdd(element: T): void
  }

  class SortedDataFactory
}

package "sorteddata.avltree" {
  class AVLTree<T>
  abstract class AVLNode<T>
  class AVLNodeFilled<T>
  class AVLNodeEmpty<T>
  class AVLIterator<T>
  class AVLTreeSlice<T>
}

package "sorteddata.sortedarraylist" {
  class SortedArrayList<T>
  class SortedArrayListIterator<T>
}

package "sorteddata.bstree" {
  class BSTree<T>
  abstract class BSNode<T>
  class BSNodeFilled<T>
  class BSNodeEmpty<T>
}

SortedData <|-- AVLTree
SortedData <|-- SortedArrayList
SortedData <|-- BSTree
SortedDataSubject <|-- SortedDataSlice
SortedDataSlice <|.. AVLTreeSlice
AVLNode <|-- AVLNodeFilled
AVLNode <|-- AVLNodeEmpty
BSNode <|-- BSNodeFilled
BSNode <|-- BSNodeEmpty
AVLTree *-- AVLNode : root
AVLTree ..> AVLIterator : creates
AVLTree ..> AVLTreeSlice : creates
SortedDataFactory ..> AVLTree : returns
@enduml`,
  },
  {
    title: 'Persistent Data Pipeline',
    source: '03-persistence-diagram.puml',
    description:
      'Use this diagram for persistent-data tasks. It shows where file IO, row formatting, serialization, and DAO population fit together.',
    code: `@startuml
skinparam packageStyle rectangle
skinparam classAttributeIconSize 0
hide empty members

title Persistent Data Pipeline

package persistentdata {
  class DataManager {
    -instance: DataManager
    -IO: IOFactory
    -userPipeline: DataPipeline<User, String[]>
    -postPipeline: DataPipeline<Post, String[]>
    -messagePipeline: DataPipeline<Message, String[]>
    +getInstance(): DataManager
    +readAll(): void
    +writeAll(): void
  }

  class DataPipeline<T,S> {
    +writeFrom(iterator: Iterator<T>): void
    +readTo(callback: AddToDAO<T>): void
  }

  interface AddToDAO<T>
  class PersistentDataException
}

package "persistentdata.io" {
  interface IOFactory
  class ComputerIOFactory
}

package "persistentdata.formatted" {
  interface FormattedFactory<S>
  interface FormattedReader<S>
  interface FormattedWriter<S>
  class CSVFormattedFactory
  class CSVReader
  class CSVWriter
}

package "persistentdata.serialization" {
  interface Serializer<T,S>
  class UserSerializer
  class PostSerializer
  class MessageSerializer
}

DataManager *-- DataPipeline
DataManager --> IOFactory
DataPipeline --> IOFactory
DataPipeline --> FormattedFactory
DataPipeline --> Serializer
IOFactory <|.. ComputerIOFactory
FormattedFactory <|.. CSVFormattedFactory
FormattedReader <|.. CSVReader
FormattedWriter <|.. CSVWriter
Serializer <|.. UserSerializer
Serializer <|.. PostSerializer
Serializer <|.. MessageSerializer
RuntimeException <|-- PersistentDataException
@enduml`,
  },
  {
    title: 'User State Pattern',
    source: '04-userstate-state-pattern.puml',
    description:
      'Use this state-pattern diagram to explain how the current user state delegates behavior and moves between guest, member, and admin modes.',
    code: `@startuml
skinparam packageStyle rectangle
skinparam classAttributeIconSize 0
hide empty members

title User State Pattern

package userstate {
  abstract class UserState {
    +isLoggedIn(): boolean
    +register(username: String, password: String): UserState
    +logout(): UserState
    +addReply(post: Post, content: String): boolean
  }

  class GuestState
  class MemberState {
    +user: User
  }

  class AdminState

  class StateManager {
    -state: UserState
    +getState(): UserState
    +login(username: String, password: String): boolean
    +register(username: String, password: String): boolean
    +logout(): boolean
    +post(post: Post, content: String): boolean
    +isLoggedIn(): boolean
  }
}

UserState <|-- GuestState
UserState <|-- MemberState
MemberState <|-- AdminState
StateManager --> UserState : current state
GuestState ..> UserDAO : register()
GuestState ..> MemberState : creates
GuestState ..> AdminState : creates
MemberState --> User
MemberState ..> Message : creates reply
MemberState ..> Post : inserts reply
@enduml`,
  },
  {
    title: 'Register/Login State Flow',
    source: '05-login-register-sequence.puml',
    description:
      'Use this sequence diagram when explaining runtime registration and login behavior through the state layer and DAO layer.',
    code: `@startuml
title Register/Login State Flow

autonumber
actor User as Actor
participant StateManager
participant GuestState
participant UserDAO
participant "User" as UserModel
participant MemberState
participant AdminState

Actor -> StateManager : register(username, password)
StateManager -> GuestState : register(username, password)
GuestState -> UserDAO : getInstance().register(username, password)
UserDAO --> GuestState : User or null

alt registration failed
  GuestState --> StateManager : same GuestState
  StateManager --> Actor : false
else registered Member
  GuestState -> MemberState : new MemberState(user)
  GuestState --> StateManager : MemberState
  StateManager --> Actor : true
else registered Admin
  GuestState -> AdminState : new AdminState(user)
  GuestState --> StateManager : AdminState
  StateManager --> Actor : true
end
@enduml`,
  },
  {
    title: 'DataManager Read/Write Sequence',
    source: '06-data-read-write-sequence.puml',
    description:
      'Use this sequence diagram when the question asks how saved data flows between DataManager, DAOs, pipelines, IO factories, formatted readers/writers, and serializers.',
    code: `@startuml
title DataManager Read/Write Sequence

autonumber
participant Client
participant DataManager
participant UserDAO
participant PostDAO
participant "DataPipeline<User,String[]>" as UserPipeline
participant "DataPipeline<Post,String[]>" as PostPipeline
participant "DataPipeline<Message,String[]>" as MessagePipeline
participant IOFactory
participant FormattedFactory
participant Serializer

Client -> DataManager : readAll()
DataManager -> UserDAO : clear()
DataManager -> PostDAO : clear()
DataManager -> UserPipeline : readTo(users::add)
UserPipeline -> IOFactory : reader("users")
UserPipeline -> FormattedFactory : reader(reader)
UserPipeline -> Serializer : deserialize(row)
UserPipeline -> UserDAO : add(user)
DataManager -> PostPipeline : readTo(posts::add)
PostPipeline -> PostDAO : add(post)
DataManager -> MessagePipeline : readTo(callback)
MessagePipeline -> Serializer : deserialize(row)
MessagePipeline -> PostDAO : get(new Post(message.thread()))
MessagePipeline -> PostDAO : post.messages.insert(message)

== Write all ==
Client -> DataManager : writeAll()
DataManager -> UserDAO : getAll()
DataManager -> UserPipeline : writeFrom(users iterator)
DataManager -> PostDAO : getAll()
DataManager -> PostPipeline : writeFrom(posts iterator)
DataManager -> PostDAO : getAllMessages()
DataManager -> MessagePipeline : writeFrom(messages iterator)
@enduml`,
  },
  {
    title: 'Censor Package',
    source: '07-censor-diagram.puml',
    description:
      'Use this focused diagram only if the optional censor package is part of the submitted MiniLab work. Keep it separate from the core architecture if it would clutter the main diagram.',
    code: `@startuml
skinparam classAttributeIconSize 0
hide empty members

title Censor Package

package censor {
  interface ICensor {
    +censorMessage(message: String): String
  }

  abstract class CensorFacade {
    +censorMessage(message: String): String
    #profaneWords(): String[]
    #safeWords(): String[]
    #keepCase(): boolean
    #finish(message: String, normalized: NormalizedMessage, matches: List<CensorMatch>): String
  }

  class CensorUsageDemo
  class ProfanityCensor
  class BlockingCensor
  class CaseSensitiveCensor
  class BernardoCensor
  class NormalizedMessage
  class MatchFinder
  class CensorMatch
  class TextMasker
  class WordLists
}

ICensor <|.. CensorFacade
CensorFacade <|-- ProfanityCensor
CensorFacade <|-- BlockingCensor
CensorFacade <|-- CaseSensitiveCensor
CensorFacade <|-- BernardoCensor
CensorUsageDemo ..> ICensor
CensorFacade --> NormalizedMessage
CensorFacade --> MatchFinder
MatchFinder --> CensorMatch
CensorFacade --> TextMasker
CensorFacade --> WordLists
@enduml`,
  },
];

function pumlCodeBlock(code) {
  return ['```puml', ...code.trim().split(/\r?\n/), '```'];
}

const PUML_LIBRARY_SECTION = [
  '## 11. Complete PUML Diagram Library',
  '',
  'The following code blocks reproduce the uploaded PUML diagram files. Copy a full block into PlantUML when you need a renderable diagram, then trim or extend it for the exact hackathon task. Names mirror the source diagrams, including any source-specific spelling.',
  '',
  ...PUML_DIAGRAMS.flatMap((diagram, index) => [
    `### 11.${index + 1}. ${diagram.title}`,
    '',
    `Source file: \`${diagram.source}\``,
    '',
    diagram.description,
    '',
    ...pumlCodeBlock(diagram.code),
    '',
  ]),
];

const UML_AUTHORING_SECTION = [
  '## 12. How to Write and Extend PUML Code',
  '',
  'PlantUML is text, so treat the diagram like source code: keep it small, grouped by package, and easy to diff. Start with `@startuml`, set a title and simple `skinparam` values, define packages/classes/interfaces, then add relationships after the class boxes.',
  '',
  'Class box basics:',
  '- Use `class Name`, `abstract class Name`, `interface Name`, `enum Name`, or `record Name` for the type.',
  '- Put fields and methods inside braces only when they help explain the design.',
  '- Prefix members with `+` for public, `#` for protected, `-` for private, and `~` for package-private.',
  '- Write methods as `+methodName(param: Type): ReturnType`.',
  '- Write fields as `-fieldName: Type`.',
  '- Prefer important public APIs and core state over every private helper.',
  '',
  'Relationship basics:',
  '- `Child --|> Parent` means inheritance or generalization.',
  '- `Class ..|> Interface` means implementation or realization.',
  '- `Owner *-- Part` means composition: the owner controls the part lifecycle.',
  '- `Whole o-- Part` means aggregation: the whole groups parts that may live independently.',
  '- `A --> B` means a structural association, usually a stored field or regular collaboration.',
  '- `A ..> B` means a dependency, usually temporary use in a method.',
  '',
  '### 12.1. Adding a New Data Structure Class',
  '',
  'For a data structure task, place the new class near `sorteddata` or a clearly named feature package. Show the abstraction it implements or extends, the stored fields that explain its invariants, and the public operations that a DAO or caller would use.',
  '',
  'Use composition for owned internal nodes, buckets, heap arrays, or trie nodes. Use realization or inheritance when the new structure implements the same API as `SortedData<T>` or a task-specific interface. Include a note label for ordering rules or tie-breakers when the algorithm depends on them.',
  '',
  '```puml',
  '@startuml',
  'skinparam classAttributeIconSize 0',
  '',
  'package "sorteddata" {',
  '  abstract class SortedData<T> {',
  '    +insert(value: T): boolean',
  '    +get(value: T): T',
  '    +getRange(start: T, count: int, backwards: boolean): Iterator<T>',
  '  }',
  '',
  '  class DS49_RangeIndex<T> {',
  '    -delegate: SortedData<T>',
  '    -comparator: Comparator<T>',
  '    +insert(value: T): boolean',
  '    +range(from: T, to: T): List<T>',
  '    +contains(value: T): boolean',
  '  }',
  '}',
  '',
  'DS49_RangeIndex --|> SortedData',
  'DS49_RangeIndex *-- SortedData : owns backing index',
  'note right of DS49_RangeIndex',
  '  Keep range output sorted by comparator.',
  '  Do not expose internal storage directly.',
  'end note',
  '@enduml',
  '```',
  '',
  '### 12.2. Adding a New Design Pattern Class',
  '',
  'For a design pattern task, name the pattern roles explicitly. A marker should be able to see which class is the Context, Strategy, ConcreteStrategy, Subject, Observer, Command, Receiver, Component, Decorator, Facade, Proxy, or State. Put the role in a stereotype when the class name alone is not enough.',
  '',
  'Use interfaces for extension points, realization arrows for implementations, and dependency arrows when a class only receives a collaborator temporarily. Use association when the context stores the strategy/state/receiver as a field.',
  '',
  '```puml',
  '@startuml',
  'skinparam classAttributeIconSize 0',
  '',
  'package "dao" {',
  '  class PostDAO',
  '}',
  '',
  'package "search" {',
  '  interface RankingStrategy <<Strategy>> {',
  '    +score(post: Post, query: String): double',
  '  }',
  '',
  '  class RecentPostRanking <<ConcreteStrategy>> {',
  '    +score(post: Post, query: String): double',
  '  }',
  '',
  '  class KeywordPostRanking <<ConcreteStrategy>> {',
  '    +score(post: Post, query: String): double',
  '  }',
  '',
  '  class SearchService <<Context>> {',
  '    -ranking: RankingStrategy',
  '    -posts: PostDAO',
  '    +setRanking(strategy: RankingStrategy): void',
  '    +search(query: String): List<Post>',
  '  }',
  '}',
  '',
  'RecentPostRanking ..|> RankingStrategy',
  'KeywordPostRanking ..|> RankingStrategy',
  'SearchService --> RankingStrategy : current strategy',
  'SearchService --> PostDAO : reads posts',
  '@enduml',
  '```',
  '',
  '### 12.3. Adding a New Persistent Data Class',
  '',
  'For a persistence task, show the file format boundary clearly. Place serializers under `persistentdata.serialization`, formatted readers/writers under `persistentdata.formatted`, and storage coordination under `persistentdata` or `persistentdata.io`. Keep the diagram honest about ownership: `DataManager` owns pipelines, pipelines use serializers and formatted factories, and IO factories create readers/writers for files.',
  '',
  'Add public methods that define the persistence contract, such as `readAll`, `writeAll`, `serialize`, `deserialize`, `reader`, `writer`, `load`, or `save`. If the task adds validation, escaping, backup, or atomic-write behavior, show that as a helper class or note.',
  '',
  '```puml',
  '@startuml',
  'skinparam classAttributeIconSize 0',
  '',
  'package "persistentdata" {',
  '  class DataManager {',
  '    -postPipeline: DataPipeline<Post, String[]>',
  '    +readAll(): void',
  '    +writeAll(): void',
  '  }',
  '',
  '  class DataPipeline<T,S> {',
  '    +readTo(callback: AddToDAO<T>): void',
  '    +writeFrom(iterator: Iterator<T>): void',
  '  }',
  '}',
  '',
  'package "persistentdata.serialization" {',
  '  interface Serializer<T,S> {',
  '    +serialize(value: T): S',
  '    +deserialize(row: S): T',
  '  }',
  '',
  '  class BackupPostSerializer {',
  '    +serialize(value: Post): String[]',
  '    +deserialize(row: String[]): Post',
  '  }',
  '}',
  '',
  'package "persistentdata.formatted" {',
  '  class AtomicCSVWriter {',
  '    +write(rows: Iterator<String[]>): void',
  '    -moveTempFileIntoPlace(): void',
  '  }',
  '}',
  '',
  'DataManager *-- DataPipeline : owns pipelines',
  'DataPipeline --> Serializer : converts objects',
  'DataPipeline ..> AtomicCSVWriter : writes rows',
  'BackupPostSerializer ..|> Serializer',
  'note right of AtomicCSVWriter',
  '  Write to a temp file first, then replace',
  '  the target file after all rows are valid.',
  'end note',
  '@enduml',
  '```',
  '',
  '### 12.4. Adding Methods Without Overcrowding the Diagram',
  '',
  'Add a method when it changes how someone understands the design. Good candidates are public API methods, constructors that inject dependencies, factory methods, strategy/state methods, serializer contracts, and operations with important side effects. Skip ordinary getters/setters unless they are central to the task.',
  '',
  'For algorithms, prefer one note beside the class over many private method lines. Example: `note right of AVLTree` can explain balancing and ordering invariants without listing every rotation helper.',
  '',
  '### 12.5. Splitting Large Diagrams',
  '',
  'If a diagram becomes crowded, split it into one overview diagram plus focused package diagrams: one for sorted data, one for persistence, one for user state/design patterns, and one sequence diagram for runtime flow. A smaller accurate diagram is better than one unreadable all-in-one diagram.',
  '',
];

const ARCHITECTURE_GUIDE_CONTENT = lines([
  '# MiniLab UML and Software Architecture Guide',
  '',
  '## 1. Scope',
  '',
  'This guide explains how to draw UML and software architecture diagrams for the original MiniLab backend codebase. The scope is intentionally limited to the imported MiniLab source packages, including `dao`, `dao.model`, `sorteddata`, `persistentdata`, `userstate`, and `censor`.',
  '',
  'Exclude practice and application-management material from the original architecture diagrams. That means no `Mock_hackathon`, Notes, To-do data, Documentation pages, manager/auth code, or website frontend/backend implementation details. Mock_hackathon classes can be shown in separate extension diagrams only when the task specifically asks for practice-code design.',
  '',
  '## 2. Package Overview',
  '',
  '- `dao.model` contains the domain objects: `User`, `Post`, `Message`, and interfaces/helpers such as `HasUUID` and `TimestampFormatter`.',
  '- `dao` stores and retrieves model objects through the generic `DAO<T>` abstraction, with `UserDAO` and `PostDAO` as concrete DAO singletons.',
  '- `sorteddata` defines the sorted collection abstraction used by the DAO layer: `SortedData<T>`, `SortedDataSlice<T>`, `SortedDataSubject<T>`, and `SortedDataFactory`.',
  '- `sorteddata.avltree`, `sorteddata.bstree`, and `sorteddata.sortedarraylist` provide concrete sorted data implementations.',
  '- `persistentdata` coordinates reading and writing model data through `DataManager` and `DataPipeline<T, S>`.',
  '- `persistentdata.formatted`, `persistentdata.io`, and `persistentdata.serialization` separate file format handling, IO factories, and object serialization.',
  '- `userstate` models guest/member/admin behavior through `UserState`, `GuestState`, `MemberState`, `AdminState`, and `StateManager`.',
  '',
  '## 3. Main UML Class Diagram',
  '',
  'The main class diagram should show the model layer, DAO layer, sorted data abstraction and implementations, persistence pipeline, and user state layer. Keep the diagram focused on package-level structure and important inheritance/dependency relationships. Do not include every private helper method unless it is central to the design.',
  '',
  '## 4. PlantUML Code: Overall Class Diagram',
  '',
  'Use this PUML / PlantUML class diagram as the starting point for the original MiniLab backend.',
  '',
  '```puml',
  '@startuml',
  'skinparam classAttributeIconSize 0',
  'skinparam backgroundColor white',
  '',
  'package "dao.model" {',
  '  interface HasUUID',
  '  interface TimestampFormatter',
  '  class TimestampFormatterTimeSinceEnglish',
  '  class User',
  '  class Post',
  '  class Message',
  '}',
  '',
  'package "dao" {',
  '  abstract class DAO<T>',
  '  class UserDAO',
  '  class PostDAO',
  '  class MessageComparator',
  '  class RandomContentGenerator',
  '}',
  '',
  'package "sorteddata" {',
  '  abstract class SortedData<T>',
  '  interface SortedDataSlice<T>',
  '  interface SortedDataSubject<T>',
  '  class SortedDataFactory',
  '}',
  '',
  'package "sorteddata.avltree" {',
  '  class AVLTree<T>',
  '  class AVLTreeSlice<T>',
  '  class AVLIterator<T>',
  '  abstract class AVLNode<T>',
  '  class AVLNodeFilled<T>',
  '  class AVLNodeEmpty<T>',
  '}',
  '',
  'package "sorteddata.bstree" {',
  '  class BSTree<T>',
  '  abstract class BSNode<T>',
  '  class BSNodeFilled<T>',
  '  class BSNodeEmpty<T>',
  '}',
  '',
  'package "sorteddata.sortedarraylist" {',
  '  class SortedArrayList<T>',
  '  class SortedArrayListIterator<T>',
  '}',
  '',
  'package "persistentdata" {',
  '  class DataManager',
  '  class DataPipeline<T, S>',
  '  class PersistentDataException',
  '}',
  '',
  'package "persistentdata.formatted" {',
  '  interface FormattedFactory<S>',
  '  interface FormattedReader<S>',
  '  interface FormattedWriter<S>',
  '  class CSVFormattedFactory',
  '  class CSVFormat',
  '  class CSVReader',
  '  class CSVWriter',
  '}',
  '',
  'package "persistentdata.io" {',
  '  interface IOFactory',
  '  class ComputerIOFactory',
  '}',
  '',
  'package "persistentdata.serialization" {',
  '  interface Serializer<T, S>',
  '  class UserSerializer',
  '  class PostSerializer',
  '  class MessageSerializer',
  '}',
  '',
  'package "userstate" {',
  '  class StateManager',
  '  abstract class UserState',
  '  class GuestState',
  '  class MemberState',
  '  class AdminState',
  '}',
  '',
  'HasUUID <|.. User',
  'HasUUID <|.. Post',
  'HasUUID <|.. Message',
  'TimestampFormatter <|.. TimestampFormatterTimeSinceEnglish',
  '',
  'DAO <|-- UserDAO',
  'DAO <|-- PostDAO',
  'DAO --> SortedData',
  'DAO ..> SortedDataFactory',
  'UserDAO --> User',
  'PostDAO --> Post',
  'PostDAO --> Message',
  'MessageComparator ..> Message',
  '',
  'SortedData <|-- AVLTree',
  'SortedData <|-- BSTree',
  'SortedData <|-- SortedArrayList',
  'SortedDataSubject <|-- SortedDataSlice',
  'SortedDataSlice <|.. AVLTreeSlice',
  'AVLTree --> AVLNode',
  'AVLNode <|-- AVLNodeFilled',
  'AVLNode <|-- AVLNodeEmpty',
  'AVLTree --> AVLIterator',
  'BSTree --> BSNode',
  'BSNode <|-- BSNodeFilled',
  'BSNode <|-- BSNodeEmpty',
  'SortedArrayList --> SortedArrayListIterator',
  '',
  'DataManager --> UserDAO',
  'DataManager --> PostDAO',
  'DataManager --> DataPipeline',
  'DataPipeline --> IOFactory',
  'DataPipeline --> FormattedFactory',
  'DataPipeline --> Serializer',
  'CSVFormattedFactory ..|> FormattedFactory',
  'CSVReader ..|> FormattedReader',
  'CSVWriter ..|> FormattedWriter',
  'ComputerIOFactory ..|> IOFactory',
  'UserSerializer ..|> Serializer',
  'PostSerializer ..|> Serializer',
  'MessageSerializer ..|> Serializer',
  '',
  'StateManager --> UserState',
  'UserState <|-- GuestState',
  'UserState <|-- MemberState',
  'MemberState <|-- AdminState',
  'GuestState --> UserDAO',
  'MemberState --> PostDAO',
  '@enduml',
  '```',
  '',
  '## UML Relationship Notation Guide',
  '',
  '![Common UML relationship notations.](/images/uml-relationships.png)',
  '',
  'Use relationship arrows to explain why classes know about each other. Do not choose arrows by appearance only: choose them from ownership, lifecycle, and type-system meaning.',
  '',
  '### Dependency',
  '',
  '- Name: Dependency.',
  '- Meaning: one class temporarily uses another class to complete work.',
  '- Arrow / line style: dashed line with an open arrow.',
  '- Direction: from the class that uses something to the class being used.',
  '- When to use it: use dependency when the target is a method parameter, local variable, factory result, or temporary helper rather than a long-lived field.',
  '- MiniLab example: a persistence helper may temporarily use `CSVReader` or `CSVWriter` while loading or saving data.',
  '- PlantUML: `Mechanic ..> Tool : uses`.',
  '',
  '### Association',
  '',
  '- Name: Association.',
  '- Meaning: one class has a regular structural relationship with another class.',
  '- Arrow / line style: solid line; an arrow is optional when you want to show navigability.',
  '- Direction: point the arrow from the class that stores/knows the other object to the known object.',
  '- When to use it: use association for fields, persistent references, or a DAO that consistently works with a model type.',
  '- MiniLab example: `PostDAO` works with `Post` and `Message` objects as part of its normal responsibility.',
  '- PlantUML: `Employee --> Company : works in`.',
  '',
  '### Aggregation',
  '',
  '- Name: Aggregation.',
  '- Meaning: weak whole-part relationship; the part can exist independently of the whole.',
  '- Arrow / line style: solid line with a hollow diamond.',
  '- Diamond side: the hollow diamond is placed on the whole/owner side.',
  '- When to use it: use aggregation when a collection groups existing objects but does not control their lifecycle.',
  '- MiniLab example: a search index or collection may aggregate `Post` references without owning the lifecycle of those posts.',
  '- PlantUML: `Lecture o-- Student : has`.',
  '',
  '### Composition',
  '',
  '- Name: Composition.',
  '- Meaning: strong whole-part relationship; parts belong to the whole lifecycle.',
  '- Arrow / line style: solid line with a filled diamond.',
  '- Diamond side: the filled diamond is placed on the whole/owner side.',
  '- When to use it: use composition when deleting the whole would also remove the internal parts.',
  '- MiniLab example: `AVLTree` owns its internal `AVLNode` objects. Those nodes are implementation details of the tree.',
  '- PlantUML: `Order *-- OrderItem : consists of`.',
  '',
  '### Generalization / Inheritance',
  '',
  '- Name: Generalization or inheritance.',
  '- Meaning: a subclass is a kind of superclass.',
  '- Arrow / line style: solid line with a hollow triangle arrowhead.',
  '- Direction: the hollow triangle points to the parent class.',
  '- When to use it: use inheritance when Java uses `extends` or when a concrete class specializes an abstract class.',
  '- MiniLab example: if `UserDAO` extends `DAO<User>`, show `UserDAO --|> DAO`.',
  '- PlantUML: `Dog --|> Animal`.',
  '',
  '### Realization / Implementation',
  '',
  '- Name: Realization or interface implementation.',
  '- Meaning: a class promises to implement an interface contract.',
  '- Arrow / line style: dashed line with a hollow triangle arrowhead.',
  '- Direction: the hollow triangle points to the interface.',
  '- When to use it: use realization when Java uses `implements`, or when a concrete class fulfills an interface role.',
  '- MiniLab example: `CSVFormattedFactory` implements `FormattedFactory`, and `ComputerIOFactory` implements `IOFactory`. If a sorted-data implementation is represented as implementing a `SortedData` interface in your diagram, use realization.',
  '- PlantUML: `Bird ..|> Fly`.',
  '',
  'Relationship | Line | Arrow end | PlantUML | Meaning',
  '--- | --- | --- | --- | ---',
  'Dependency | Dashed | Open arrow | `A ..> B` | A temporarily uses B',
  'Association | Solid | Optional open arrow | `A --> B` | A structurally knows B',
  'Aggregation | Solid | Hollow diamond on whole | `A o-- B` | A groups B, but B can live alone',
  'Composition | Solid | Filled diamond on whole | `A *-- B` | A owns B lifecycle',
  'Generalization | Solid | Hollow triangle to parent | `Child --|> Parent` | Child extends Parent',
  'Realization | Dashed | Hollow triangle to interface | `Class ..|> Interface` | Class implements Interface',
  '',
  '## Mapping UML Relationships to the MiniLab Codebase',
  '',
  'Use the original MiniLab source packages only: `dao`, `dao.model`, `sorteddata`, `sorteddata.avltree`, `sorteddata.bstree`, `sorteddata.sortedarraylist`, `persistentdata`, `persistentdata.formatted`, `persistentdata.io`, `persistentdata.serialization`, `userstate`, and `censor`.',
  '',
  'Exclude `Mock_hackathon`, Notes, To-do, Documentation itself, manager/auth code, and website frontend/backend code from original MiniLab architecture diagrams.',
  '',
  'DAO layer: show `DAO<T>` to `UserDAO` and `PostDAO` as inheritance/generalization when the concrete DAOs extend the abstract DAO. If the DAO stores a sorted collection as a field, show association to that collection. If it asks a factory to create a collection temporarily, show dependency.',
  '',
  'Model layer: show `User`, `Post`, `Message`, and `HasUUID`. If model classes implement `HasUUID`, use realization from the model class to `HasUUID`.',
  '',
  'Sorted data layer: show the sorted-data abstraction and concrete implementations. Use realization for interface implementation, inheritance for abstract base classes, and composition where a tree owns internal node objects such as `AVLNode` or `BSNode`.',
  '',
  'Persistence layer: show `DataManager`, `DataPipeline`, serializers, formatted factories/readers/writers, and IO factories. Use dependency for temporary read/write operations. Use association when a class stores a serializer, factory, DAO, or pipeline as a field.',
  '',
  'User state layer: show `StateManager` connected to `UserState`. Show state implementations with realization if `UserState` is an interface, or generalization if `UserState` is an abstract class.',
  '',
  '## PlantUML Examples for Relationship Types',
  '',
  'This compact example shows the six common UML relationship types in PlantUML.',
  '',
  '```puml',
  '@startuml',
  'skinparam backgroundColor white',
  'skinparam classAttributeIconSize 0',
  '',
  'class Mechanic',
  'class Tool',
  'Mechanic ..> Tool : uses',
  '',
  'class Employee',
  'class Company',
  'Employee --> Company : works in',
  '',
  'class Lecture',
  'class Student',
  'Lecture o-- Student : has',
  '',
  'class Order',
  'class OrderItem',
  'Order *-- OrderItem : consists of',
  '',
  'class Animal',
  'class Dog',
  'Dog --|> Animal',
  '',
  'interface Fly',
  'class Bird',
  'Bird ..|> Fly',
  '@enduml',
  '```',
  '',
  'This MiniLab-focused example shows typical relationships without including practice or generated folders.',
  '',
  '```puml',
  '@startuml',
  'skinparam backgroundColor white',
  'skinparam classAttributeIconSize 0',
  '',
  'package "dao.model" {',
  '  interface HasUUID',
  '  class User',
  '  class Post',
  '  class Message',
  '}',
  '',
  'package "dao" {',
  '  abstract class DAO<T>',
  '  class UserDAO',
  '  class PostDAO',
  '}',
  '',
  'package "sorteddata" {',
  '  abstract class SortedData<T>',
  '  class AVLTree<T>',
  '  class BSTree<T>',
  '  class SortedArrayList<T>',
  '}',
  '',
  'package "sorteddata.avltree" {',
  '  abstract class AVLNode<T>',
  '}',
  '',
  'User ..|> HasUUID',
  'Post ..|> HasUUID',
  'Message ..|> HasUUID',
  '',
  'UserDAO --|> DAO',
  'PostDAO --|> DAO',
  '',
  'AVLTree --|> SortedData',
  'BSTree --|> SortedData',
  'SortedArrayList --|> SortedData',
  '',
  'AVLTree *-- AVLNode : owns nodes',
  'PostDAO --> Post : stores',
  'PostDAO --> Message : reads replies',
  '@enduml',
  '```',
  '',
  '## 5. Software Architecture Diagram',
  '',
  'The software architecture diagram is a higher-level view than the class diagram. It should show the caller layer, user state layer, DAO layer, model layer, sorted data layer, persistence layer, and file system/CSV layer. This is useful when explaining why persistence, sorted data structures, and user state behavior are separated.',
  '',
  '## 6. PlantUML Code: Software Architecture',
  '',
  'Use this PUML / PlantUML component diagram for a clean architecture overview.',
  '',
  '```puml',
  '@startuml',
  'skinparam backgroundColor white',
  'skinparam componentStyle rectangle',
  '',
  'package "Application / Feature Code" {',
  '  [MainActivity or Caller]',
  '}',
  '',
  'package "User State Layer" {',
  '  [StateManager]',
  '  [GuestState]',
  '  [MemberState]',
  '  [AdminState]',
  '}',
  '',
  'package "DAO Layer" {',
  '  [DAO<T>]',
  '  [UserDAO]',
  '  [PostDAO]',
  '}',
  '',
  'package "Model Layer" {',
  '  [User]',
  '  [Post]',
  '  [Message]',
  '  [HasUUID]',
  '}',
  '',
  'package "Sorted Data Layer" {',
  '  [SortedData<T>]',
  '  [AVLTree<T>]',
  '  [BSTree<T>]',
  '  [SortedArrayList<T>]',
  '}',
  '',
  'package "Persistent Data Layer" {',
  '  [DataManager]',
  '  [DataPipeline<T, S>]',
  '  [Serializer<T, S>]',
  '  [FormattedFactory<S>]',
  '  [IOFactory]',
  '}',
  '',
  'database "Local Files / CSV / Serialized Data" as Files',
  '',
  '[MainActivity or Caller] --> [StateManager]',
  '[StateManager] --> [UserDAO]',
  '[StateManager] --> [PostDAO]',
  '[UserDAO] --> [User]',
  '[PostDAO] --> [Post]',
  '[PostDAO] --> [Message]',
  '[DAO<T>] --> [SortedData<T>]',
  '[SortedData<T>] <|-- [AVLTree<T>]',
  '[SortedData<T>] <|-- [BSTree<T>]',
  '[SortedData<T>] <|-- [SortedArrayList<T>]',
  '[DataManager] --> [UserDAO]',
  '[DataManager] --> [PostDAO]',
  '[DataManager] --> [DataPipeline<T, S>]',
  '[DataPipeline<T, S>] --> [Serializer<T, S>]',
  '[DataPipeline<T, S>] --> [FormattedFactory<S>]',
  '[DataPipeline<T, S>] --> [IOFactory]',
  '[DataPipeline<T, S>] --> Files',
  '@enduml',
  '```',
  '',
  '## 7. Where to Add New Hackathon Classes',
  '',
  'New data structure tasks usually belong near `sorteddata` or in a separate feature package that depends on `dao.model` ids and values. Persistent data tasks should extend `persistentdata`, `persistentdata.formatted`, `persistentdata.io`, or `persistentdata.serialization` depending on whether the task changes storage coordination, file formats, IO, or object conversion. Design pattern tasks should be placed according to the role they play: DAO near `dao`, Strategy near search/ranking services, Observer near notification or event features, State near `userstate`, and Command near moderation or edit actions.',
  '',
  'For architecture marking, keep practice files such as `Mock_hackathon` separate from the original MiniLab diagram. Show them in an extension diagram if the task specifically asks how a new feature plugs in.',
  '',
  '## 8. UML Extension Instructions',
  '',
  '- Add one class box for each new important task class.',
  '- Include fields and methods only when they explain the design.',
  '- Use inheritance arrows for interfaces and abstract classes.',
  '- Use dependency arrows for DAOs, serializers, factories, strategies, observers, commands, and state transitions.',
  '- Keep diagrams readable by splitting large diagrams into package-specific diagrams.',
  '- Do not include every test class in the production class diagram unless the assessment asks for a test architecture diagram.',
  '',
  '## 9. Software Architecture Extension Instructions',
  '',
  'When adding a new layer, label the layer by responsibility rather than by one class name. For a new persistence feature, show how the feature reaches `DataManager`, `DataPipeline`, serializers, formatted readers/writers, and local files. For a new design pattern, show the pattern roles explicitly: Strategy and ConcreteStrategy, Subject and Observer, Command and Receiver, Component and Decorator, or Context and State.',
  '',
  'Keep test packages separate. A test diagram may show JUnit tests depending on public APIs, but production architecture diagrams should focus on runtime classes.',
  '',
  '## 10. Recommended Diagram Tools',
  '',
  '- PlantUML for class diagrams, component diagrams, and PUML text that can be version controlled.',
  '- Mermaid for lightweight diagrams when the website or Markdown renderer supports Mermaid better than PlantUML.',
  '- diagrams.net / draw.io for manually arranged submission diagrams.',
  '',
  ...PUML_LIBRARY_SECTION,
  ...UML_AUTHORING_SECTION,
  '## 13. Quick Checklist',
  '',
  '- Are all major packages represented?',
  '- Are DAO/model relationships clear?',
  '- Are sorted data implementations shown?',
  '- Is persistence separated from model and DAO behavior?',
  '- Are state classes shown?',
  '- Are test classes excluded from production architecture unless specifically needed?',
  '- Is `Mock_hackathon` excluded from the original MiniLab architecture diagram?',
  '- Does the diagram stay readable without too many private helper details?',
]);

async function ensureRootUser() {
  const result = await query(
    `
      INSERT INTO app_users (
        username,
        display_name,
        role,
        status,
        avatar_color,
        default_todo_color
      )
      VALUES ('zach', 'Zach', 'root_manager', 'active', '#d97706', '#F59E0B')
      ON CONFLICT (username)
      DO UPDATE SET
        role = 'root_manager',
        status = 'active',
        display_name = COALESCE(NULLIF(app_users.display_name, ''), 'Zach'),
        updated_at = NOW()
      RETURNING id
    `
  );

  return result.rows[0].id;
}

async function ensureGuideSpace(ownerUserId) {
  const existing = await query(
    `
      SELECT id
      FROM documentation_spaces
      WHERE lower(name) = lower($1)
      ORDER BY id
      LIMIT 1
    `,
    [SPACE_NAME]
  );

  if (existing.rows[0]) {
    const updated = await query(
      `
        UPDATE documentation_spaces
        SET description = $2,
            owner_user_id = COALESCE(owner_user_id, $3),
            visibility = 'public_to_users',
            archived = false,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [existing.rows[0].id, SPACE_DESCRIPTION, ownerUserId]
    );

    return updated.rows[0].id;
  }

  const created = await query(
    `
      INSERT INTO documentation_spaces (
        name,
        description,
        owner_user_id,
        visibility,
        marker_color
      )
      VALUES ($1, $2, $3, 'public_to_users', $4)
      RETURNING id
    `,
    [SPACE_NAME, SPACE_DESCRIPTION, ownerUserId, '#64748B']
  );

  return created.rows[0].id;
}

async function upsertPage({
  spaceId,
  ownerUserId,
  title,
  oldTitles = [],
  content,
  instructionType,
}) {
  const candidates = [title, ...oldTitles].map((value) => value.toLowerCase());
  const existing = await query(
    `
      SELECT id
      FROM documentation_pages
      WHERE lower(title) = ANY($1::text[])
      ORDER BY id
      LIMIT 1
    `,
    [candidates]
  );

  if (existing.rows[0]) {
    const updated = await query(
      `
        UPDATE documentation_pages
        SET space_id = $2,
            title = $3,
            content = $4,
            instruction_type = $5,
            owner_user_id = $6,
            visibility = 'public_to_users',
            archived = false,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [
        existing.rows[0].id,
        spaceId,
        title,
        content,
        instructionType,
        ownerUserId,
      ]
    );

    return updated.rows[0].id;
  }

  const created = await query(
    `
      INSERT INTO documentation_pages (
        space_id,
        title,
        content,
        instruction_type,
        owner_user_id,
        visibility
      )
      VALUES ($1, $2, $3, $4, $5, 'public_to_users')
      RETURNING id
    `,
    [spaceId, title, content, instructionType, ownerUserId]
  );

  return created.rows[0].id;
}

async function main() {
  const ownerUserId = await ensureRootUser();
  const spaceId = await ensureGuideSpace(ownerUserId);
  const gitPageId = await upsertPage({
    spaceId,
    ownerUserId,
    title: GIT_GUIDE_TITLE,
    oldTitles: GIT_GUIDE_OLD_TITLES,
    content: GIT_GUIDE_CONTENT,
    instructionType: 'workflow',
  });
  const architecturePageId = await upsertPage({
    spaceId,
    ownerUserId,
    title: ARCHITECTURE_GUIDE_TITLE,
    content: ARCHITECTURE_GUIDE_CONTENT,
    instructionType: 'architecture',
  });
  const codebaseGuidePageId = await upsertPage({
    spaceId,
    ownerUserId,
    title: CODEBASE_GUIDE_TITLE,
    oldTitles: CODEBASE_GUIDE_OLD_TITLES,
    content: CODEBASE_GUIDE_CONTENT,
    instructionType: 'coding',
  });

  console.log(
    `Seeded documentation guides: ${GIT_GUIDE_TITLE} (page ${gitPageId}), ${ARCHITECTURE_GUIDE_TITLE} (page ${architecturePageId}), ${CODEBASE_GUIDE_TITLE} (page ${codebaseGuidePageId}).`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
