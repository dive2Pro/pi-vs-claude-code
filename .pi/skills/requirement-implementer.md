---
name: requirement-implementer
description: Execute and implement requirements with progress tracking, TDD methodology, and comprehensive testing. Always maintains progress file, follows strict TDD workflow with e2e tests, and strives for excellence in design and implementation. Keywords - implement, execute, tdd, test, e2e, progress, tracking, development, coding, realization.
allowed-tools: Read, Write, Edit, Bash, Grep, Find, Ls
---

# Requirement Implementer

## Purpose

Transform approved plans into production-ready code through disciplined execution with continuous progress tracking, test-driven development, and uncompromising quality standards.

## Core Principles

1. **Progress Persistence** - All state changes must be written to progress file immediately
2. **Test-Driven Development** - Write tests first, always. No exceptions.
3. **E2E Coverage** - Every feature must have end-to-end tests
4. **Maximum Effort** - Design thoughtfully, implement thoroughly, optimize relentlessly
5. **Atomic Commits** - Each step is a complete, testable unit

## Progress File Structure

### File: `.pi/progress/{feature-name}.md`

```markdown
# Progress: {Feature Name}

## Meta
- Created: {timestamp}
- Updated: {timestamp}
- Status: planning | developing | testing | reviewing | completed
- Phase: {current phase number}
- Total Phases: {count}

## Requirement
{Original requirement text}

## Implementation Plan
{Detailed plan from analyzer}

## Progress Tracking

### Phase 1: Setup & Architecture
- Status: pending | in-progress | completed | blocked
- Started: {timestamp or null}
- Completed: {timestamp or null}
- Tasks:
  - [x] Task 1 - {timestamp}
  - [ ] Task 2
  - [ ] Task 3
- Notes: {observations, decisions, blockers}
- Tests: {test coverage status}

### Phase 2: Core Implementation
- Status: pending
- Tasks:
  - [ ] Task 1
  - [ ] Task 2
- Notes:
- Tests:

### Phase 3: Integration & E2E
- Status: pending
- Tasks:
  - [ ] Task 1
  - [ ] Task 2
- Notes:
- Tests:

### Phase 4: Polish & Optimization
- Status: pending
- Tasks:
  - [ ] Task 1
  - [ ] Task 2
- Notes:
- Tests:

## Test Coverage
- Unit Tests: {count} tests, {coverage%}%
- Integration Tests: {count} tests
- E2E Tests: {count} scenarios
- Coverage Target: 80%+

## Design Decisions
{Log of architectural decisions with rationale}

## Blockers & Issues
- [ ] Issue 1: {description} - {resolution plan}
- [x] Issue 2: {description} - RESOLVED: {solution}

## Next Actions
1. {Immediate next task}
2. {Following task}

## Lessons Learned
{What worked well, what could improve}
```

## Workflow

### Step 0: Initialize Progress Tracking

**ALWAYS FIRST** - Create progress file before any implementation:

```bash
# Create progress directory if needed
mkdir -p .pi/progress

# Create progress file with initial structure
# Use Write tool to create .pi/progress/{feature-name}.md
```

**Progress File Naming:**
- Use kebab-case: `realtime-collaboration.md`
- Derive from feature name, not issue number
- Keep it descriptive but concise

### Step 1: Requirement Analysis

Before coding, understand what you're building:

```markdown
## Actions:
1. Read the requirement document
2. Read the implementation plan (if provided)
3. Update progress file with:
   - Requirement summary
   - Implementation plan
   - Phase breakdown
   - Initial task list
4. Mark Step 1 as completed in progress file
```

### Step 2: Architecture & Design

**Design with maximum effort - this is your foundation:**

```markdown
## Design Checklist:
- [ ] Identify core abstractions
- [ ] Define interfaces and contracts
- [ ] Plan module structure
- [ ] Consider edge cases
- [ ] Plan error handling strategy
- [ ] Consider performance implications
- [ ] Plan for testability
- [ ] Document design decisions

## Update Progress File:
- Status: planning
- Add design decisions to progress file
- Log architectural choices with rationale
```

### Step 3: Setup Test Infrastructure

**TDD Rule: No production code without a failing test first**

```bash
# Setup test framework if needed
# Create test directories
mkdir -p tests/unit tests/integration tests/e2e

# Create initial test files
touch tests/unit/{feature}.test.ts
touch tests/integration/{feature}.integration.test.ts
touch tests/e2e/{feature}.e2e.test.ts
```

**Update Progress File:**
- Mark test infrastructure as completed
- Note test framework choices

### Step 4: TDD Cycle - Unit Tests

**Strict TDD Workflow:**

```markdown
For each component/function:

1. **RED** - Write failing test
   ```typescript
   describe('Component', () => {
     it('should do X when Y', () => {
       // Arrange
       // Act
       // Assert (expect failure)
     });
   });
   ```
   
2. **Run test - verify it fails**
   ```bash
   npm test -- --grep "should do X when Y"
   ```
   
3. **GREEN** - Write minimum code to pass
   - Implement only what's needed
   - Don't over-engineer
   
4. **Run test - verify it passes**
   
5. **REFACTOR** - Improve code quality
   - Remove duplication
   - Improve naming
   - Optimize structure
   - Keep tests passing
   
6. **Update progress file**
   - Mark task as [x] with timestamp
   - Note any interesting decisions
   - Update test coverage stats

7. **Commit**
   ```bash
   git add -A
   git commit -m "feat: implement X functionality

   - Add Y capability
   - Include unit tests
   - Test coverage: X%"
   ```
```

### Step 5: TDD Cycle - Integration Tests

```markdown
For each module integration:

1. **Write integration test**
   - Test real interactions
   - Use actual dependencies (or realistic mocks)
   - Verify contracts
   
2. **Verify test fails**
   
3. **Implement integration**
   - Connect components
   - Handle edge cases
   - Error handling
   
4. **Verify test passes**
   
5. **Refactor if needed**
   
6. **Update progress file**
   
7. **Commit**
```

### Step 6: E2E Test Scenarios

**Every feature needs E2E tests:**

```markdown
## E2E Test Planning:
- [ ] Identify user workflows
- [ ] Define success criteria
- [ ] Plan test data setup
- [ ] Plan cleanup strategy

## For each E2E scenario:

1. **Write E2E test**
   ```typescript
   describe('Feature E2E', () => {
     beforeAll(() => {
       // Setup test environment
     });
     
     afterAll(() => {
       // Cleanup
     });
     
     it('should complete user workflow X', async () => {
       // Simulate real user actions
       // Verify outcomes
     });
   });
   ```
   
2. **Run E2E test - verify failure**
   
3. **Implement feature fully**
   
4. **Run E2E test - verify success**
   
5. **Update progress file**
   - Document E2E scenarios
   - Note any environment issues
   
6. **Commit**
```

### Step 7: Implementation Quality Checklist

**Maximum effort means checking everything:**

```markdown
## Code Quality:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage meets target (80%+)
- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] All edge cases handled
- [ ] Error messages are helpful
- [ ] Code is well-documented
- [ ] Naming is clear and consistent

## Design Quality:
- [ ] Follows SOLID principles
- [ ] DRY (Don't Repeat Yourself)
- [ ] KISS (Keep It Simple, Stupid)
- [ ] YAGNI (You Aren't Gonna Need It)
- [ ] Proper separation of concerns
- [ ] Extensible where appropriate
- [ ] No premature optimization

## Performance:
- [ ] No obvious performance issues
- [ ] Efficient data structures
- [ ] Minimal unnecessary computations
- [ ] Proper async/await usage

## Security:
- [ ] Input validation
- [ ] No injection vulnerabilities
- [ ] Proper error handling (no leaks)
- [ ] Secure defaults

## Testing:
- [ ] Unit tests cover all logic
- [ ] Integration tests cover interactions
- [ ] E2E tests cover user workflows
- [ ] Edge cases tested
- [ ] Error paths tested
- [ ] Tests are maintainable

## Documentation:
- [ ] README updated
- [ ] API documentation
- [ ] Code comments where needed
- [ ] Examples provided
```

### Step 8: Continuous Progress Updates

**Update progress file on EVERY state change:**

```markdown
## When to Update:
- Starting a task
- Completing a task
- Encountering a blocker
- Making a design decision
- Writing a test
- Fixing a bug
- Refactoring code
- ANY status change

## Update Format:
1. Update Status field
2. Update Phase progress
3. Mark tasks as [x] with timestamp
4. Add notes/decisions
5. Update test coverage
6. Update next actions
```

### Step 9: Final Review & Completion

```markdown
## Pre-Completion Checklist:
- [ ] All phases completed
- [ ] All tests passing
- [ ] Code coverage met
- [ ] Documentation complete
- [ ] Progress file final state
- [ ] Lessons learned documented
- [ ] Ready for review/deployment

## Update Progress File:
- Status: completed
- Add completion timestamp
- Document final test coverage
- List lessons learned
- Archive progress file
```

## Progress File Commands

```bash
# Initialize new progress file
cat > .pi/progress/{feature}.md << 'EOF'
[Initial structure]
EOF

# View current progress
cat .pi/progress/{feature}.md

# Update specific section
# Use Edit tool to modify progress file

# List all progress files
ls -la .pi/progress/

# Archive completed progress
mv .pi/progress/{feature}.md .pi/progress/archive/{feature}.completed.md
```

## TDD Best Practices

### Test Writing
1. **One assertion per test** (when practical)
2. **Descriptive test names** (should/when/then pattern)
3. **Arrange-Act-Assert** pattern
4. **Test behavior, not implementation**
5. **Keep tests independent**

### Test Coverage
1. **Happy paths** - normal usage
2. **Edge cases** - boundary conditions
3. **Error paths** - failure scenarios
4. **Integration points** - module interactions
5. **User workflows** - E2E scenarios

### Test Maintenance
1. **Refactor tests with code**
2. **Keep tests readable**
3. **Avoid test interdependence**
4. **Use test fixtures wisely**
5. **Mock external dependencies**

## Maximum Effort Guidelines

### Design Phase
- Explore multiple approaches
- Consider future extensibility
- Plan for failure modes
- Document trade-offs
- Seek simplicity in complexity

### Implementation Phase
- Write clean, readable code
- Use meaningful names
- Keep functions focused
- Handle all error cases
- Add helpful comments

### Testing Phase
- Test thoroughly, not just adequately
- Think like a user
- Test the unexpected
- Verify behavior, not just output
- Make tests documentation

### Review Phase
- Self-review first
- Check against requirements
- Verify test coverage
- Look for improvements
- Document decisions

## Example Workflow

### Feature: Add User Authentication

```bash
# Step 0: Initialize
mkdir -p .pi/progress
# Create .pi/progress/user-authentication.md

# Step 1: Analyze requirement
# Update progress file with plan

# Step 2: Design
# - Define auth interface
# - Plan token management
# - Consider security implications
# Update progress: design decisions

# Step 3: Setup tests
mkdir -p tests/{unit,integration,e2e}
touch tests/unit/auth.test.ts
touch tests/integration/auth.integration.test.ts
touch tests/e2e/auth.e2e.test.ts

# Step 4-6: TDD Implementation
# For each component:
#   1. Write failing test
#   2. Run test (verify fail)
#   3. Implement code
#   4. Run test (verify pass)
#   5. Refactor
#   6. Update progress file
#   7. Commit

# Step 7: Quality check
# Run all quality checklists
# Update progress file

# Step 8: Continuous updates
# Update progress on every change

# Step 9: Final review
# Complete all checklists
# Mark progress as completed
```

## Progress File Update Triggers

**ALWAYS update progress file when:**

1. ✅ Starting any task
2. ✅ Completing any task
3. ✅ Encountering error/blocker
4. ✅ Resolving blocker
5. ✅ Making design decision
6. ✅ Writing test
7. ✅ Test passes/fails unexpectedly
8. ✅ Refactoring code
9. ✅ Discovering edge case
10. ✅ Changing approach
11. ✅ Committing code
12. ✅ Reviewing code
13. ✅ ANY state change

## Response Template

When implementing a requirement:

```markdown
# Implementation: {Feature Name}

## 📋 Current Status
- Phase: {number}/{total}
- Task: {current task}
- Tests: {status}

## 🔄 Progress Update
{What was just completed/changed}

## 📝 Next Actions
1. {Immediate next step}
2. {Following step}

## 💾 Progress File Updated
{Confirmation that progress file was updated}
```

## Integration with Other Skills

- **After requirement-analyzer**: Use this skill to execute the plan
- **During development**: Maintain progress file religiously
- **When blocked**: Document blocker in progress file, seek help
- **On completion**: Archive progress file for future reference

## Notes

- Progress file is your source of truth - update it religiously
- TDD is non-negotiable - no production code without tests
- E2E tests verify real user value - always include them
- Maximum effort means never settling for "good enough"
- Atomic commits keep history clean and reversible
- Progress tracking enables resumption after interruptions
