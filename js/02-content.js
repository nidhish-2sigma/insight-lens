/* Insight Lens mock · content: textbooks, skills, prerequisite links, signature questions, the two demo sections
   and five test shapes (tiny, brand-new, self-paced, very large, bare data) that the same rules must survive.
   Everything here is invented for the mock. Chapter and subunit names follow the shape of real CS textbooks. */
(function (root) {
  'use strict';
  var IL = root.IL;
  var C = (IL.content = {});

  // Chapter: [number, name, [[code, subunit name, 'skill|skill|~taught-only skill'], ...]]
  C.textbooks = {
    csa2: {
      name: 'CS Awesome 2.0', short: 'CS Awesome', kind: 'Textbook', lang: 'java', set: 'java', accent: '#1864F2',
      chapters: [
        ['1', 'Using Objects and Methods', [
          ['1.2', 'Variables and Data Types', 'Declare and initialize variables|Primitive data types|~Naming conventions'],
          ['1.3', 'Expressions and Output', 'Arithmetic operators|Integer division and remainder|Print output'],
          ['1.5', 'Casting and Ranges of Variables', 'Type casting|Integer overflow|~Rounding with casts'],
          ['1.9', 'Method Signatures', 'Method signatures|Parameters and arguments|Method return values'],
          ['1.11', 'Using the Math Class', 'Math class methods|Random number generation'],
          ['1.13', 'Creating and Storing Objects', 'Objects as instances of classes|Calling constructors|Reference variables and null'],
          ['1.14', 'Calling Instance Methods', 'Calling instance methods|Void versus non-void methods|~Method chaining'],
          ['1.15', 'String Manipulation', 'String concatenation|String methods|Substring indexing']
        ]],
        ['2', 'Selection and Iteration', [
          ['2.1', 'Boolean Expressions', 'Relational operators|Boolean expressions'],
          ['2.3', 'if Statements', 'if and if-else statements|Tracing conditional flow'],
          ['2.4', 'Nested if Statements', 'Nested conditionals|Chained else-if ranges'],
          ['2.5', 'Compound Boolean Expressions', 'Logical operators|Short-circuit evaluation|~De Morgan\'s laws'],
          ['2.7', 'While Loops', 'While loop structure|Loop conditions and termination|Sentinel loops'],
          ['2.8', 'For Loops', 'For loop header|Loop bounds and off-by-one|Converting between loop types'],
          ['2.9', 'Selection and Iteration Algorithms', 'Accumulator pattern|Counting with conditions|Finding minimum and maximum'],
          ['2.10', 'String Algorithms', 'Traversing a string|Building strings in loops|~Reversing a string'],
          ['2.11', 'Nested Iteration', 'Nested loop tracing|Counting nested iterations|Loop patterns with rows and columns'],
          ['2.12', 'Informal Runtime Analysis', 'Statement execution counts|~Comparing loop growth']
        ]],
        ['3', 'Class Creation', [
          ['3.3', 'Anatomy of a Class', 'Class definition|Instance variables|Access modifiers'],
          ['3.4', 'Constructors', 'Writing constructors|Default and overloaded constructors'],
          ['3.5', 'Writing Methods', 'Writing instance methods|Accessor methods|Mutator methods'],
          ['3.6', 'Passing and Returning References', 'Passing object references|Returning objects from methods'],
          ['3.7', 'Static Variables and Methods', 'Static methods|Static variables'],
          ['3.8', 'Scope and Access', 'Variable scope|Local versus instance variables'],
          ['3.9', 'The this Keyword', 'Using this']
        ]],
        ['4', 'Data Collections', [
          ['4.3', 'Array Creation and Access', 'Array declaration and creation|Array indexing|Array default values'],
          ['4.4', 'Array Traversals', 'Traversing with for loops|Enhanced for loop|Index out of bounds errors'],
          ['4.5', 'Implementing Array Algorithms', 'Summing and averaging arrays|Searching an array|Shifting and swapping elements'],
          ['4.6', 'Using Text Files', 'Reading a file with Scanner|~File exceptions|~Parsing lines'],
          ['4.8', 'ArrayList Methods', 'ArrayList creation|ArrayList add, get, set, remove'],
          ['4.9', 'ArrayList Traversals', 'Traversing an ArrayList|Removing during traversal'],
          ['4.11', '2D Arrays', '2D array creation and access|Row-major order'],
          ['4.12', '2D Array Traversals', 'Nested loop 2D traversal|Row and column algorithms']
        ]],
        ['5', 'Inheritance', [
          ['5.1', 'Superclasses and Subclasses', 'Extending a class|The is-a relationship'],
          ['5.2', 'Constructors in Subclasses', 'Calling super constructors'],
          ['5.3', 'Overriding Methods', 'Method overriding|Calling super methods'],
          ['5.5', 'Polymorphism', 'Polymorphic references']
        ]]
      ]
    },
    labs: {
      name: 'Java Short Labs', short: 'Short Labs', kind: 'Labs', lang: 'java', set: 'java', accent: '#16A085', supplemental: true, itemType: 'activecode', perSub: 5, ease: -0.55,
      chapters: [['L', 'Labs', [
        ['Lab 1', 'Strings and Math', 'String methods|Substring indexing|Math class methods'],
        ['Lab 2', 'Loops', 'For loop header|Loop bounds and off-by-one|Accumulator pattern'],
        ['Lab 3', 'Arrays', 'Array indexing|Traversing with for loops|Summing and averaging arrays'],
        ['Lab 4', 'Classes', 'Class definition|Writing constructors|Writing instance methods']
      ]]]
    },
    prep: {
      name: 'Be Prepared for the AP CS Exam', short: 'Be Prepared', kind: 'Exam prep', lang: 'java', set: 'java', accent: '#9C27B0', supplemental: true, itemType: 'mchoice', perSub: 10, ease: -0.15,
      chapters: [['P', 'Practice sets', [
        ['Set A', 'Selection and Iteration', 'Logical operators|Chained else-if ranges|Loop bounds and off-by-one|Nested loop tracing'],
        ['Set B', 'Arrays', 'Array indexing|Traversing with for loops|Searching an array'],
        ['Set C', 'Classes and Objects', 'Class definition|Writing constructors|Accessor methods']
      ]]]
    },
    fopp: {
      name: 'Foundations of Python Programming', short: 'FOPP', kind: 'Textbook', lang: 'python', set: 'python', accent: '#1864F2',
      chapters: [
        ['2', 'Variables, Statements and Expressions', [
          ['2.2', 'Values and Data Types', 'Values and types|Type conversion functions'],
          ['2.6', 'Variables', 'Assignment statements|~Variable naming rules'],
          ['2.8', 'Operators and Operands', 'Arithmetic operators|Integer division and modulo|Order of operations'],
          ['2.13', 'Input', 'Reading input|Converting input to numbers']
        ]],
        ['6', 'Sequences', [
          ['6.2', 'Strings and Lists', 'String and list literals|The len function'],
          ['6.3', 'Index Operator', 'Index operator|Negative indices'],
          ['6.5', 'The Slice Operator', 'Slice operator|Slice boundaries'],
          ['6.8', 'Splitting and Joining', 'Splitting strings|~Joining lists']
        ]],
        ['7', 'Iteration', [
          ['7.2', 'The for Loop', 'for loop over a sequence|Loop variable tracing'],
          ['7.5', 'Lists and for Loops', 'Iterating over lists|The range function'],
          ['7.6', 'The Accumulator Pattern', 'Accumulating a total|Accumulating with strings'],
          ['7.7', 'Traversal by Index', 'Traversing by index|range with len']
        ]],
        ['8', 'Conditionals', [
          ['8.3', 'Boolean Expressions', 'Comparison operators|Boolean values'],
          ['8.4', 'Logical Operators', 'and, or, not|~Operator precedence in conditions'],
          ['8.7', 'Conditional Execution', 'if statements|if-else statements'],
          ['8.9', 'Chained Conditionals', 'elif chains|Nested conditionals'],
          ['8.10', 'Accumulator with Conditionals', 'Filtering while accumulating|Counting matches']
        ]],
        ['9', 'Transforming Sequences', [
          ['9.2', 'Mutability', 'Mutable lists|Immutable strings'],
          ['9.5', 'Aliasing and Cloning', 'Object references and aliasing|Cloning lists'],
          ['9.7', 'Append versus Concatenate', 'The append method|List concatenation'],
          ['9.9', 'Non-mutating String Methods', 'String methods return new strings|~Formatting strings'],
          ['9.13', 'Accumulating Lists', 'Building a list with append|List accumulation patterns']
        ]],
        ['12', 'Functions', [
          ['12.2', 'Function Definition', 'Defining functions|Function parameters'],
          ['12.5', 'Returning Values', 'Return statements|None and missing returns'],
          ['12.6', 'Decoding a Function', 'Tracing function calls'],
          ['12.9', 'Local Variables', 'Local variable scope|~Global variables']
        ]],
        ['10', 'Files', [
          ['10.2', 'Reading a File', 'Opening files|Iterating over file lines'],
          ['10.8', 'Writing Text Files', 'Writing files']
        ]]
      ]
    },
    gym: {
      name: 'Logic Gym: Python Fundamentals', short: 'Logic Gym', kind: 'Practice', lang: 'python', set: 'python', accent: '#16A085', supplemental: true, perSub: 8, ease: -0.35,
      chapters: [['G', 'Workouts', [
        ['Workout 1', 'Strings', 'Index operator|Slice operator|Slice boundaries'],
        ['Workout 2', 'Loops', 'for loop over a sequence|Accumulating a total|The range function'],
        ['Workout 3', 'Conditionals', 'if statements|elif chains|Counting matches'],
        ['Workout 4', 'Lists', 'Mutable lists|The append method|Building a list with append']
      ]]]
    }
  };

  // Prerequisite links, prerequisite first. Links inside one subunit are added automatically.
  C.edges = {
    java: [
      ['Objects as instances of classes', 'Class definition'], ['Objects as instances of classes', 'Instance variables'],
      ['Objects as instances of classes', 'Writing constructors'], ['Objects as instances of classes', 'Passing object references'],
      ['Objects as instances of classes', 'Using this'], ['Objects as instances of classes', 'Extending a class'],
      ['Objects as instances of classes', 'ArrayList creation'], ['Objects as instances of classes', 'Polymorphic references'],
      ['Objects as instances of classes', 'Static methods'], ['Objects as instances of classes', 'Returning objects from methods'],
      ['Objects as instances of classes', 'The is-a relationship'], ['Objects as instances of classes', 'Calling instance methods'],
      ['Calling constructors', 'Writing constructors'], ['Calling constructors', 'Default and overloaded constructors'],
      ['Calling constructors', 'Calling super constructors'], ['Calling constructors', 'ArrayList creation'],
      ['Method return values', 'Writing instance methods'], ['Method return values', 'Accessor methods'],
      ['Method return values', 'Returning objects from methods'], ['Method return values', 'Static methods'],
      ['Method return values', 'Method overriding'], ['Method return values', 'Searching an array'],
      ['Method return values', 'Math class methods'], ['Method return values', 'Void versus non-void methods'],
      ['Parameters and arguments', 'Writing instance methods'], ['Parameters and arguments', 'Mutator methods'],
      ['Parameters and arguments', 'Passing object references'], ['Parameters and arguments', 'Writing constructors'],
      ['Method signatures', 'Writing instance methods'], ['Method signatures', 'Method overriding'], ['Method signatures', 'Calling instance methods'],
      ['Loop bounds and off-by-one', 'Traversing with for loops'], ['Loop bounds and off-by-one', 'Index out of bounds errors'],
      ['Loop bounds and off-by-one', 'Traversing an ArrayList'], ['Loop bounds and off-by-one', 'Nested loop 2D traversal'],
      ['Loop bounds and off-by-one', 'Traversing a string'], ['Loop bounds and off-by-one', 'Counting nested iterations'],
      ['Loop bounds and off-by-one', 'Removing during traversal'], ['Loop bounds and off-by-one', 'Shifting and swapping elements'],
      ['Loop bounds and off-by-one', 'Row and column algorithms'],
      ['For loop header', 'Traversing with for loops'], ['For loop header', 'Enhanced for loop'], ['For loop header', 'Nested loop tracing'],
      ['Accumulator pattern', 'Summing and averaging arrays'], ['Accumulator pattern', 'Building strings in loops'], ['Accumulator pattern', 'Row and column algorithms'],
      ['Array indexing', 'Traversing with for loops'], ['Array indexing', 'Searching an array'], ['Array indexing', 'Shifting and swapping elements'],
      ['Array indexing', '2D array creation and access'], ['Array indexing', 'ArrayList add, get, set, remove'],
      ['Nested loop tracing', 'Nested loop 2D traversal'], ['Nested loop tracing', 'Row and column algorithms'],
      ['Logical operators', 'Counting with conditions'], ['Logical operators', 'Searching an array'],
      ['Chained else-if ranges', 'Counting with conditions'], ['Boolean expressions', 'if and if-else statements'], ['Boolean expressions', 'Logical operators'],
      ['if and if-else statements', 'Nested conditionals'], ['Boolean expressions', 'While loop structure'],
      ['Integer division and remainder', 'Counting with conditions'], ['Integer division and remainder', 'Shifting and swapping elements'],
      ['Integer division and remainder', 'Type casting'], ['Integer division and remainder', 'Row-major order'],
      ['Calling instance methods', 'String methods'], ['Calling instance methods', 'Accessor methods'],
      ['Calling instance methods', 'ArrayList add, get, set, remove'], ['Calling instance methods', 'Calling super methods'],
      ['Declare and initialize variables', 'Variable scope'], ['Declare and initialize variables', 'Array declaration and creation'],
      ['Instance variables', 'Local versus instance variables'], ['Instance variables', 'Static variables'], ['Instance variables', 'Accessor methods'],
      ['Class definition', 'Extending a class'], ['Class definition', 'Writing constructors'], ['Class definition', 'Static methods'],
      ['Substring indexing', 'Traversing a string'], ['While loop structure', 'For loop header'], ['Primitive data types', 'Type casting'],
      ['Random number generation', 'Counting with conditions']
    ],
    python: [
      ['Index operator', 'Slice operator'], ['Index operator', 'Traversing by index'], ['Index operator', 'Mutable lists'],
      ['Index operator', 'Iterating over file lines'], ['Slice boundaries', 'Cloning lists'], ['Slice boundaries', 'String methods return new strings'],
      ['The range function', 'range with len'], ['The range function', 'Traversing by index'], ['The range function', 'Tracing function calls'],
      ['for loop over a sequence', 'Iterating over lists'], ['for loop over a sequence', 'Accumulating a total'],
      ['for loop over a sequence', 'Filtering while accumulating'], ['for loop over a sequence', 'Iterating over file lines'],
      ['Loop variable tracing', 'Traversing by index'], ['Loop variable tracing', 'range with len'], ['Loop variable tracing', 'Accumulating with strings'],
      ['Loop variable tracing', 'Building a list with append'], ['Loop variable tracing', 'Tracing function calls'], ['Loop variable tracing', 'List accumulation patterns'],
      ['Accumulating a total', 'Filtering while accumulating'], ['Accumulating a total', 'Counting matches'],
      ['Accumulating a total', 'Building a list with append'], ['Accumulating a total', 'List accumulation patterns'],
      ['Accumulating a total', 'Return statements'], ['Accumulating a total', 'Writing files'], ['Accumulating a total', 'Iterating over file lines'],
      ['Assignment statements', 'Object references and aliasing'], ['Assignment statements', 'Accumulating a total'],
      ['Assignment statements', 'Local variable scope'], ['Assignment statements', 'Defining functions'],
      ['if statements', 'elif chains'], ['if statements', 'Filtering while accumulating'], ['Comparison operators', 'if statements'],
      ['Comparison operators', 'and, or, not'], ['Mutable lists', 'Object references and aliasing'], ['Mutable lists', 'The append method'],
      ['Mutable lists', 'Building a list with append'], ['Mutable lists', 'Function parameters'], ['Mutable lists', 'List accumulation patterns'],
      ['Mutable lists', 'String methods return new strings'],
      ['Integer division and modulo', 'Counting matches'], ['Integer division and modulo', 'Order of operations'],
      ['Splitting strings', 'Iterating over file lines'], ['Values and types', 'Assignment statements'], ['Type conversion functions', 'Converting input to numbers'],
      ['String and list literals', 'Index operator'], ['Defining functions', 'Return statements'], ['Defining functions', 'Tracing function calls'],
      ['The append method', 'Building a list with append'], ['Opening files', 'Writing files']
    ]
  };

  // Signature questions: named items with a known wrong-answer pattern, used by the reteach and code cards.
  C.signature = {
    'csa2:1.3': [{ name: 'Integer Division Surprise', type: 'mchoice', dok: 2, skill: 'Integer division and remainder', n: 4, dominant: 0.72, b: 0.5,
      stem: 'What is printed by System.out.println(7 / 2 * 2.0); ?', labels: ['7.0', '6.0', '7', '3.5'], key: 1, wrong: 0 }],
    'csa2:1.9': [{ name: 'Parameter Passing Effects', type: 'mchoice', dok: 3, skill: 'Parameters and arguments', n: 5, dominant: 0.45, b: 0.6,
      stem: 'After calling change(x) where change assigns 10 to its int parameter, what is x?', labels: ['10', 'unchanged', '0', 'compile error', 'null'], key: 1, wrong: 0 }],
    'csa2:1.11': [{ name: 'Random Probability in Java', type: 'mchoice', dok: 3, skill: 'Random number generation', n: 4, dominant: 0.55, b: 0.9,
      stem: 'Which expression gives a random int from 1 to 6 inclusive?', labels: ['(int)(Math.random() * 6)', '(int)(Math.random() * 6) + 1', '(int)(Math.random() * 7)', '(int) Math.random() * 6 + 1'], key: 1, wrong: 0 }],
    'csa2:2.3': [{ name: 'Sequential If Statements Logic', type: 'mchoice', dok: 2, skill: 'Tracing conditional flow', n: 4, dominant: 0.6, b: 1.1,
      stem: 'Two separate if statements test x > 5 and x > 2 with x = 7. What is printed?', labels: ['A only', 'A then stops', 'A and B', 'B only'], key: 2, wrong: 1 }],
    'csa2:2.4': [{ name: 'Chained If-Else Range Logic', type: 'mchoice', dok: 3, skill: 'Chained else-if ranges', n: 5, dominant: 0.5, b: 1.5,
      stem: 'A chain tests score >= 60, then >= 70, then >= 80, then >= 90. What grade does 85 receive?', labels: ['B', 'C', 'D', 'A', 'F'], key: 2, wrong: 0 }],
    'csa2:2.8': [{ name: 'Off-by-One Loop Bound', type: 'mchoice', dok: 2, skill: 'Loop bounds and off-by-one', n: 4, dominant: 0.68, b: 0.8,
      stem: 'How many times does for (int i = 1; i <= 10; i++) run its body?', labels: ['9', '10', '11', '1'], key: 1, wrong: 0 }],
    'csa2:2.9': [{ name: 'FRQ Selection 3: Grade Ranges', type: 'activecode', dok: 3, skill: 'Counting with conditions', b: 0.7, tests: 4, hard: 3, err: 'missing return statement', stage: 'compile' }],
    'csa2:2.10': [{ name: 'Count Vowels', type: 'activecode', dok: 3, skill: 'Traversing a string', b: 0.3, tests: 4, hard: 2, err: 'StringIndexOutOfBoundsException', stage: 'runtime' }],
    'csa2:2.11': [{ name: 'Nested Loop Output Count', type: 'mchoice', dok: 3, skill: 'Counting nested iterations', n: 4, dominant: 0.58, b: 0.9,
      stem: 'How many stars does a 3-by-4 nested loop print?', labels: ['7', '12', '3', '4'], key: 1, wrong: 0 }],
    'csa2:4.3': [{ name: 'Default int Initialization', type: 'mchoice', dok: 1, skill: 'Array default values', n: 4, dominant: 0.5, b: 1.2,
      stem: 'What does a new int[5] contain before any assignment?', labels: ['null in each slot', 'nothing, it will not compile', 'random values', '0 in each slot'], key: 3, wrong: 0 }],
    'csa2:4.4': [{ name: 'ArrayIndexOutOfBounds in Loops', type: 'mchoice', dok: 3, skill: 'Index out of bounds errors', n: 5, dominant: 0.42, b: 0.9,
      stem: 'Which loop header causes an exception when traversing arr?', labels: ['i < arr.length', 'i <= arr.length - 1', 'i <= arr.length', 'i < arr.length - 1', 'none of these'], key: 2, wrong: 3 }],
    'csa2:4.5': [{ name: 'Average of an Array', type: 'activecode', dok: 3, skill: 'Summing and averaging arrays', b: 0.5, tests: 5, hard: 3, err: 'ArrayIndexOutOfBoundsException', stage: 'runtime' },
      { name: 'Shift Left by One', type: 'activecode', dok: 3, skill: 'Shifting and swapping elements', b: 1.0, tests: 4, hard: 4, err: 'ArrayIndexOutOfBoundsException', stage: 'runtime' }],
    'fopp:2.8': [{ name: 'Floor Division Result', type: 'mchoice', dok: 2, skill: 'Integer division and modulo', n: 4, dominant: 0.66, b: 0.7,
      stem: 'What does 7 // 2 evaluate to?', labels: ['3.5', '3', '4', '1'], key: 1, wrong: 0 }],
    'fopp:6.5': [{ name: 'Slice End Index', type: 'mchoice', dok: 2, skill: 'Slice boundaries', n: 4, dominant: 0.7, b: 0.9,
      stem: 'For s = "python", what is s[1:4]?', labels: ['"ytho"', '"yth"', '"pyth"', '"pyt"'], key: 1, wrong: 0 }],
    'fopp:7.2': [{ name: 'Loop Variable After the Loop', type: 'mchoice', dok: 3, skill: 'Loop variable tracing', n: 4, dominant: 0.52, b: 1.0,
      stem: 'After for ch in "abc": pass, what is ch?', labels: ['"a"', 'an error', '"c"', '"abc"'], key: 2, wrong: 1 }],
    'fopp:7.5': [{ name: 'range Stop Value', type: 'mchoice', dok: 2, skill: 'The range function', n: 4, dominant: 0.64, b: 0.6,
      stem: 'What numbers does range(1, 5) produce?', labels: ['1 to 5', '1 to 4', '0 to 5', '0 to 4'], key: 1, wrong: 0 }],
    'fopp:7.6': [{ name: 'Running Total', type: 'activecode', dok: 3, skill: 'Accumulating a total', b: 0.5, tests: 4, hard: 2, err: 'NameError', stage: 'runtime' },
      { name: 'Accumulator Initial Value', type: 'mchoice', dok: 2, skill: 'Accumulating a total', n: 4, dominant: 0.55, b: 0.8,
        stem: 'Where must total = 0 go for the accumulator to work?', labels: ['inside the loop', 'before the loop', 'after the loop', 'it is optional'], key: 1, wrong: 0 }],
    'fopp:8.9': [{ name: 'elif Order Matters', type: 'mchoice', dok: 3, skill: 'elif chains', n: 4, dominant: 0.5, b: 1.0,
      stem: 'A chain tests x > 0, then x > 10, then x > 100 with x = 50. Which branch runs?', labels: ['second', 'first', 'third', 'none'], key: 1, wrong: 0 }],
    'fopp:8.10': [{ name: 'Count Long Words', type: 'activecode', dok: 3, skill: 'Counting matches', b: 0.6, tests: 4, hard: 3, err: 'IndexError', stage: 'runtime' }],
    'fopp:9.5': [{ name: 'Aliased List Mutation', type: 'mchoice', dok: 3, skill: 'Object references and aliasing', n: 4, dominant: 0.6, b: 1.3,
      stem: 'After b = a and b.append(4), what is a for a = [1, 2, 3]?', labels: ['[1, 2, 3]', '[1, 2, 3, 4]', '[4]', 'an error'], key: 1, wrong: 0 },
      { name: 'Clone and Extend', type: 'activecode', dok: 3, skill: 'Cloning lists', b: 0.8, tests: 4, hard: 4, err: 'TypeError', stage: 'runtime' }]
  };

  C.errors = {
    java: { compile: ['cannot find symbol', 'missing return statement', 'incompatible types', "';' expected"], runtime: ['ArrayIndexOutOfBoundsException', 'StringIndexOutOfBoundsException', 'NullPointerException'] },
    python: { compile: ['SyntaxError', 'IndentationError'], runtime: ['IndexError', 'NameError', 'TypeError', 'ZeroDivisionError'] }
  };

  C.variants = {
    mchoice: ['predict the output', 'trace the code', 'spot the error', 'which is true'],
    fillintheblank: ['fill in the value', 'complete the line'],
    dragndrop: ['match the terms'],
    parsonsprob: ['arrange the lines', 'order and indent'],
    activecode: ['write the method', 'fix the code', 'complete the program'],
    shortanswer: ['explain your approach']
  };

  // Two sections. Personas are assigned by roster position so the same students carry the same story every load.
  C.sections = [
    {
      id: 's1', name: 'AP Computer Science A', period: 'Period 2', teacher: 'Ms. Alvarez', seed: 2611,
      textbooks: [{ id: 'csa2', role: 'primary' }, { id: 'labs', role: 'supplemental' }, { id: 'prep', role: 'supplemental' }],
      set: 'java', bands: true, mode: 'in-class',
      classDows: [0, 1, 2, 3, 4], classHour: 10, classLen: 48, lessonDows: [0, 3], dueAfter: 3, quietWeeks: [7],
      opened: { '1': 8, '2': 10, '4': 4 }, chapterOrder: ['1', '2', '4'],
      retryFast: 0.45, thetaSd: 0.66, thetaShift: 0.15,
      weak: { 'Objects as instances of classes': 1.9, 'Method return values': 1.3, 'Loop bounds and off-by-one': 1.15, 'Integer division and remainder': 1.2,
        'Random number generation': 1.7, 'Chained else-if ranges': 1.2, 'Index out of bounds errors': 1.0, 'Counting nested iterations': 0.9 },
      strong: { 'String concatenation': 0.9, 'Relational operators': 0.8, 'Print output': 0.7 },
      chapterDecay: { '4': { start: [1, 0.975, 0.965, 0.955], finish: [0.95, 0.9, 0.8, 0.68] } },
      supp: [
        { tb: 'labs', sub: 'Lab 1', day: 18, due: 24, use: 0.86 }, { tb: 'labs', sub: 'Lab 2', day: 39, due: 45, use: 0.62 }, { tb: 'labs', sub: 'Lab 3', day: 67, due: 73, use: 0.22 },
        { tb: 'prep', sub: 'Set A', day: 60, due: 66, use: 0.88 }, { tb: 'prep', sub: 'Set B', day: 74, due: 80, use: 0.72 }
      ],
      specials: [
        { kind: 'quiz', name: 'Unit 2 Test', chapter: '2', day: 68, due: 68, n: 12, use: 0.97 },
        { kind: 'review', name: 'Unit 4A Array Review', chapter: '4', day: 80, due: 83, n: 8, frq: 3, use: 0.93, audienceCut: 4 },
        { kind: 'abandoned', name: 'ALPS 1.3 (old copy, do not use)', sub: '1.3', day: 4, due: 8 },
        { kind: 'abandoned', name: 'Loops warm-up DRAFT', sub: '2.7', day: 30, due: 31 }
      ],
      actions: [
        { type: 'Exit Ticket', title: 'Exit Ticket · Chained else-if ranges', skills: ['Chained else-if ranges'], who: 'class', day: 37, n: 3, boost: 1.5, recheckAfter: 3 },
        { type: 'Remediation', title: 'Remediation · Nested iteration', skills: ['Nested loop tracing', 'Counting nested iterations'], who: 9, day: 66, n: 6, boost: 1.3, recheckAfter: 7 },
        { type: 'Remediation', title: 'Remediation · Loop bounds', skills: ['Loop bounds and off-by-one'], who: 8, day: 74, n: 5, boost: 1.0, recheckAfter: 7 },
        { type: 'Check-in', title: 'Checked in with a student who went quiet', who: 'quiet', day: 77 }
      ],
      students: ['Aaliyah Brooks', 'Mateo Rivera', 'Priya Shah', 'Jordan Miles', 'Chen Yu', 'Sofia Greco', 'Liam Okafor', 'Noor Aziz', 'Ethan Kim', 'Zoe Tran',
        'Diego Herrera', 'Maya Patel', 'Kofi Asante', 'Hana Sato', 'Lucas Ferreira', 'Amara Nwosu', 'Owen Doyle', 'Ivy Jensen', 'Ravi Menon', 'Elena Vasquez',
        'Caleb Wright', 'Nia Coleman', 'Tariq Hassan', 'Lena Bauer', 'Omar Bakr', 'Grace Lin', 'Mina Kovac', 'Leo Wagner', 'Ana Kim', 'Sam Porter', 'Tess Lang', 'Ben Rossi'],
      personas: { quiet: [27, 28], grind: [3, 2, 29, 12], coast: [24, 17, 8, 21, 14], guess: [29, 15, 20], late: [29, 6, 22, 10], streak: [27, 19],
        slip: [13, 5, 25, 18], rise: [9, 1, 16], stuck: [3, 23], ready: [24, 17, 8], joined: { 31: 79 } },
      questions: [{ who: 2, sub: '4.5', text: 'Why does my loop stop one element early?' }, { who: 24, sub: '4.4', text: 'Is an enhanced for loop allowed on the test?' }],
      gradingFailed: 6, feedbackSeen: [18, 25]
    },
    {
      id: 's2', name: 'Introduction to Python', period: 'Block B', teacher: 'Ms. Alvarez', seed: 7734,
      textbooks: [{ id: 'fopp', role: 'primary' }, { id: 'gym', role: 'supplemental' }],
      set: 'python', bands: false, mode: 'homework',
      classDows: [1, 3], classHour: 13, classLen: 80, lessonDows: [1, 3], dueAfter: 5, quietWeeks: [4, 7],
      opened: { '2': 4, '6': 4, '7': 4, '8': 5, '9': 3 }, chapterOrder: ['2', '6', '7', '8', '9'],
      retryFast: 0.5, thetaSd: 0.7, thetaShift: -0.05, fastFirst: 0.3,
      weak: { 'Loop variable tracing': 1.3, 'Integer division and modulo': 1.2, 'Mutable lists': 1.8, 'Accumulating a total': 1.25, 'Slice boundaries': 1.2,
        'Object references and aliasing': 1.7, 'Cloning lists': 1.2, 'elif chains': 0.8 },
      strong: { 'Comparison operators': 0.9, 'String and list literals': 0.8 },
      chapterDecay: { '9': { start: [0.97, 0.93, 0.9], finish: [0.9, 0.82, 0.72] } },
      supp: [
        { tb: 'gym', sub: 'Workout 1', day: 22, due: 30, use: 0.7 }, { tb: 'gym', sub: 'Workout 2', day: 43, due: 48, use: 0.55 }, { tb: 'gym', sub: 'Workout 3', day: 66, due: 72, use: 0.45 }
      ],
      specials: [
        { kind: 'quiz', name: 'Iteration Quiz', chapter: '7', day: 57, due: 57, n: 10, use: 0.92 },
        { kind: 'review', name: 'Explain Your Loop (written)', chapter: '8', day: 73, due: 78, n: 5, frq: 2, use: 0.8 },
        { kind: 'abandoned', name: 'Old slicing homework (ignore)', sub: '6.5', day: 15, due: 17 }
      ],
      actions: [
        { type: 'Warm-up', title: 'Warm-up · Slice boundaries', skills: ['Slice boundaries', 'Slice operator'], who: 'class', day: 31, n: 4, boost: 0.9, recheckAfter: 5 },
        { type: 'Remediation', title: 'Remediation · Accumulator pattern', skills: ['Accumulating a total', 'Accumulating with strings'], who: 7, day: 71, n: 5, boost: 1.1, recheckAfter: 7 }
      ],
      students: ['Devin Reyes', 'Kira Sandoval', 'Rae Nakamura', 'Aiden Park', 'Mia Castillo', 'Noah Varga', 'Jun Hayashi', 'Fatima Zaman', 'Isla Moreau', 'Andre Thompson',
        'Yara Elmasri', 'Marcus Dunn', 'Bao Nguyen', 'Camila Soto', 'Felix Grant', 'Rohan Pillai', 'Selin Aksoy', 'Theo Jacobs', 'Uma Rao', 'Wes Carter',
        'Xavi Lopez', 'Yuki Ono', 'Zane Foster', 'Lily Quinn', 'Pax Morrow'],
      personas: { quiet: [5, 9, 19], grind: [1, 13], coast: [7, 16, 22], guess: [3, 11, 14, 20, 0], late: [3, 4, 11, 17, 21, 23], streak: [9, 12],
        slip: [2, 15, 6], rise: [8, 18, 10], stuck: [13, 4], ready: [7, 16], never: [23, 21], offRoster: [24] },
      questions: [{ who: 8, sub: '9.5', text: 'I do not understand why changing b changed a.' }],
      gradingFailed: 2, feedbackSeen: [9, 16]
    }
  ];

  // ---------- test shapes ----------
  // Sections that exist to prove the Lens holds up on data it was not tuned for. Each one derives from a demo
  // section and changes its shape: roster size, how long it has run, whether work is assigned at all, and
  // which evidence (norms, prerequisite graph, code questions, bands, a second textbook) is missing.
  var FIRST = ['Ada', 'Bilal', 'Cora', 'Dmitri', 'Esme', 'Farid', 'Gia', 'Hugo', 'Ines', 'Jonah', 'Keiko', 'Luca', 'Mei', 'Nikhil', 'Odile', 'Pablo', 'Quinn', 'Rosa', 'Sami', 'Tova',
    'Uri', 'Vera', 'Wren', 'Ximena', 'Yusuf', 'Zara', 'Arlo', 'Bea', 'Cyrus', 'Dalia', 'Emil', 'Freya', 'Gabe', 'Halle', 'Idris', 'Juno', 'Kai', 'Leila', 'Milo', 'Nadia'];
  var LAST = ['Abara', 'Bell', 'Castro', 'Dang', 'Eze', 'Flores', 'Gupta', 'Haddad', 'Ito', 'Joshi', 'Kowalski', 'Lund', 'Mbeki', 'Novak', 'Ortiz', 'Pereira', 'Qureshi', 'Romano', 'Silva', 'Tanaka',
    'Ulloa', 'Vance', 'Weiss', 'Xu', 'Yilmaz', 'Zhou', 'Amari', 'Boyd', 'Chavez', 'Dube', 'Ekström', 'Fofanah', 'Greene', 'Hoang', 'Ivanov', 'Jung', 'Kaya', 'Lopes', 'Mwangi', 'Nasser'];
  C.names = function (n, shift) {
    var out = [];
    for (var i = 0; i < n; i++) { var k = i + (shift || 0); out.push(FIRST[k % FIRST.length] + ' ' + LAST[(7 * k + 3 * Math.floor(k / FIRST.length)) % LAST.length]); }
    return out;
  };
  function derive(base, over) {
    var o = {};
    Object.keys(base).forEach(function (k) { o[k] = base[k]; });
    Object.keys(over).forEach(function (k) { o[k] = over[k]; });
    o.group = 'test';
    return o;
  }
  var S1 = C.sections[0], S2 = C.sections[1];
  C.sections.push(
    derive(S1, { id: 't1', name: 'Tiny seminar', period: '6 students', shape: 'Tiny class', seed: 4101,
      textbooks: [{ id: 'csa2', role: 'primary' }, { id: 'labs', role: 'supplemental' }],
      supp: [{ tb: 'labs', sub: 'Lab 1', day: 18, due: 24, use: 0.9 }],
      specials: [{ kind: 'quiz', name: 'Unit 2 Test', chapter: '2', day: 68, due: 68, n: 12, use: 0.97 }, { kind: 'review', name: 'Unit 4A Array Review', chapter: '4', day: 80, due: 83, n: 8, frq: 3, use: 0.93 }],
      actions: [{ type: 'Remediation', title: 'Remediation · Loop bounds', skills: ['Loop bounds and off-by-one'], who: 2, day: 74, n: 5, boost: 1.0, recheckAfter: 7 }],
      students: ['Imani Okoye', 'Felix Baumann', 'Sana Mirza', 'Theo Lindqvist', 'Paloma Reyes', 'Kenji Mori'],
      personas: { quiet: [4], grind: [1], coast: [], guess: [2], late: [2], streak: [], slip: [3], rise: [], stuck: [1], ready: [0] },
      questions: [{ who: 1, sub: '4.4', text: 'Does the loop need to stop at length - 1?' }], gradingFailed: 1, feedbackSeen: [1, 3] }),
    derive(S2, { id: 't2', name: 'New cohort', period: 'started last week', shape: 'Brand-new class', seed: 4202, startWeek: 11,
      mode: 'in-class', classDows: [0, 1, 2, 3, 4], classHour: 9, classLen: 50, lessonDows: [0, 2, 4], dueAfter: 2, quietWeeks: [],
      opened: { '2': 3 }, chapterOrder: ['2'], chapterDecay: {}, supp: [], specials: [], actions: [],
      students: C.names(20, 3), personas: { quiet: [], grind: [], coast: [], guess: [5], late: [3, 7], streak: [], slip: [], rise: [], stuck: [], ready: [], never: [18] },
      questions: [], gradingFailed: 0, feedbackSeen: [0, 0] }),
    derive(S2, { id: 't3', name: 'Self-paced Python', period: 'no assignments', shape: 'Self-paced, nothing assigned', seed: 4303, selfPaced: true,
      textbooks: [{ id: 'fopp', role: 'primary' }], mode: 'homework', classDows: [], lessonDows: [], quietWeeks: [],
      opened: { '2': 4, '6': 4, '7': 4, '8': 5, '9': 5, '12': 4 }, chapterOrder: ['2', '6', '7', '8', '9', '12'], chapterDecay: {}, supp: [], specials: [], actions: [],
      students: C.names(18, 41), personas: { quiet: [5], grind: [2], coast: [9], guess: [7, 11], late: [14, 3], streak: [], slip: [13], rise: [4], stuck: [2], ready: [9] },
      questions: [], gradingFailed: 0, feedbackSeen: [3, 6] }),
    derive(S1, { id: 't4', name: 'Lecture cohort', period: '150 students', shape: 'Very large class', seed: 4404,
      students: C.names(150, 80),
      actions: [
        { type: 'Exit Ticket', title: 'Exit Ticket · Chained else-if ranges', skills: ['Chained else-if ranges'], who: 'class', day: 37, n: 3, boost: 1.5, recheckAfter: 3 },
        { type: 'Remediation', title: 'Remediation · Loop bounds', skills: ['Loop bounds and off-by-one'], who: 30, day: 74, n: 5, boost: 1.0, recheckAfter: 7 },
        { type: 'Check-in', title: 'Checked in with a student who went quiet', who: 'quiet', day: 77 }],
      personas: { quiet: [27, 58, 91, 120, 133, 141], grind: [3, 12, 40, 77, 101, 119, 60, 88], coast: [24, 17, 8, 21, 14, 66, 97, 110, 125], guess: [29, 15, 20, 51, 73, 99, 130, 144],
        late: [29, 6, 22, 10, 45, 69, 83, 107, 126, 139], streak: [27, 19, 54, 92, 113], slip: [13, 5, 25, 18, 62, 80, 104, 136], rise: [9, 1, 16, 47, 71, 95], stuck: [3, 23, 56, 85, 122],
        ready: [24, 17, 8, 66, 97], never: [149, 64], joined: { 148: 79, 147: 76 } },
      questions: [{ who: 2, sub: '4.5', text: 'Why does my loop stop one element early?' }, { who: 24, sub: '4.4', text: 'Is an enhanced for loop allowed on the test?' }, { who: 51, sub: '4.3', text: 'Is the last index length or length - 1?' }],
      gradingFailed: 14, feedbackSeen: [70, 110] }),
    derive(S1, { id: 't5', name: 'Single textbook', period: 'bare data', shape: 'One textbook, no norms, no skill graph, no code questions, no bands', seed: 4505,
      textbooks: [{ id: 'csa2', role: 'primary' }], bands: false, norms: false, graph: false, noCode: true, supp: [],
      specials: [{ kind: 'quiz', name: 'Unit 2 Test', chapter: '2', day: 68, due: 68, n: 12, use: 0.97 }],
      actions: [{ type: 'Exit Ticket', title: 'Exit Ticket · Chained else-if ranges', skills: ['Chained else-if ranges'], who: 'class', day: 37, n: 3, boost: 1.5, recheckAfter: 3 }],
      students: C.names(22, 240), personas: { quiet: [6], grind: [2, 9], coast: [3], guess: [4], late: [11], streak: [15], slip: [13], rise: [1], stuck: [], ready: [3] },
      questions: [], gradingFailed: 0, feedbackSeen: [0, 0] })
  );
})(typeof window !== 'undefined' ? window : globalThis);
