const pageManager = (function() {
    // Private variables and functions here
    let _listeningBlanks = [];
    let _comprehensionAnswers = {};
    let _mistakesToHighlight = [];
    let _vocabularyDragWords = [];
    let _vocabularySentences = []; // If you dynamically create sentences too

    const revealedLetters = {}; // Stays private to this module instance

    // Private helper functions
    function _revealHint(blankId, solution) {
        const blankElement = document.getElementById(blankId);
        if (!blankElement) return;

        if (!revealedLetters[blankId]) {
            revealedLetters[blankId] = 0;
        }

        if (revealedLetters[blankId] < solution.length) {
            revealedLetters[blankId]++;
            const partiallyRevealed = solution.substring(0, revealedLetters[blankId]) +
                                                '_'.repeat(solution.length - revealedLetters[blankId]);
            blankElement.textContent = partiallyRevealed;
        }
    }

    function _revealSolution(blankId, solution) {
        const blankElement = document.getElementById(blankId);
        if (blankElement) {
            blankElement.textContent = solution;
            revealedLetters[blankId] = solution.length;
        }
    }

    // Public functions (exposed through the return object)
    function init(data) {
        // Assign the passed data to private variables
        _listeningBlanks = data.listeningBlanks || [];
        _comprehensionAnswers = data.comprehensionAnswers || {};
        _mistakesToHighlight = data.mistakesToHighlight || [];
        _vocabularyDragWords = data.vocabularyDragWords || [];
        _vocabularySentences = data.vocabularySentences || [];

        // Load common elements (header, footer)
        _loadPartial('header-placeholder', 'header.html');
        // _loadPartial('footer-placeholder', 'footer.html'); // if you have one

        // Setup page-specific elements using the loaded data
        // _populateListeningClips(); I don't think this is necessary?
        _populateDraggableWords(); // Ensure this is called with _vocabularyDragWords
        _setupEventListeners(); // Attach event listeners once
        setupListeningBlanks();
    }

    function _loadPartial(placeholderId, filePath) {
        fetch(filePath)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.text();
            })
            .then(html => {
                document.getElementById(placeholderId).innerHTML = html;
            })
            .catch(error => {
                console.error(`Error loading ${filePath}:`, error);
                document.getElementById(placeholderId).innerHTML = `<p>Error loading ${filePath.split('/').pop()}.</p>`;
            });
    }

    // function _populateListeningClips() {
    //     const listeningSection = document.getElementById('listening');
    //     if (listeningSection && _listeningBlanks.length > 0) {
    //         let clipContainer = document.querySelector('#listening .listening-clip-container');
    //         if (!clipContainer) {
    //             clipContainer = document.createElement('div');
    //             clipContainer.classList.add('listening-clip-container');
    //             listeningSection.appendChild(clipContainer);
    //         }
    //         clipContainer.innerHTML = '';
    //
    //         _listeningBlanks.forEach(clipData => {
    //             const clipDiv = document.createElement('div');
    //             clipDiv.classList.add('listening-clip');
    //
    //             clipDiv.innerHTML = `
    //                 <div class="clip-video">
    //                     <video id="${clipData.id}-video" controls>
    //                         <source src="${clipData.videoSrc}" type="video/mp4">
    //                         Your browser does not support the video tag.
    //                     </video>
    //                 </div>
    //                 <div class="clip-transcript">
    //                     <p>${clipData.transcript}</p>
    //                     <button class="hint-button" data-blank-id="${clipData.id}" data-solution="${clipData.solution}">Hint</button>
    //                     <button class="solution-button" data-blank-id="${clipData.id}" data-solution="${clipData.solution}">Solution</button>
    //                 </div>
    //             `;
    //             clipContainer.appendChild(clipDiv);
    //         });
    //     }
    // }

    // --- JavaScript for Interactive Listening Blanks ---

    // // It's good practice to wrap your script in a DOMContentLoaded listener
    // document.addEventListener('DOMContentLoaded', () => {
    //     // Initialize the page manager first, if it sets up general page elements
    //     // pageManager.init(pageData); // Uncomment if pageManager.init is defined elsewhere and needed here
    //
    //     // Call the function to set up interactive listening blanks
    //     setupListeningBlanks();
    // });

    function setupListeningBlanks() {
        // Find all listening clips
        const listeningClips = document.querySelectorAll('.listening-clip');

        listeningClips.forEach(clipContainer => {
            const blankSpan = clipContainer.querySelector('.blank-word');
            const hintButton = clipContainer.querySelector('.hint-button');
            const solutionButton = clipContainer.querySelector('.solution-button');

            if (blankSpan) {
                const solution = blankSpan.dataset.solution.trim(); // Get the correct solution
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = '_______'; // Placeholder for the input field

                // Clear the original HTML content (the old '_______') and append the new input
                blankSpan.innerHTML = '';
                blankSpan.appendChild(input);

                // Create and append the feedback icon span
                const feedbackIcon = document.createElement('span');
                feedbackIcon.classList.add('feedback-icon');
                blankSpan.appendChild(feedbackIcon);

                // Add event listener to check answer when user leaves the input field
                input.addEventListener('blur', () => {
                    checkListeningBlank(input, solution, blankSpan, feedbackIcon);
                });

                // Add event listener for "Enter" key to check answer
                input.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault(); // Prevent default form submission behavior
                        checkListeningBlank(input, solution, blankSpan, feedbackIcon);
                        input.blur(); // Remove focus after checking
                    }
                });

                // Hint Button Logic
                if (hintButton) {
                    hintButton.addEventListener('click', () => {
                        // input.disabled = false
                        if (input.disabled) return; // Do nothing if input is disabled (solution shown)

                        let currentVal = input.value;
                        if (currentVal.length < solution.length) {
                            input.value = solution.substring(0, currentVal.length + 1);
                        }
                        // Remove any previous feedback when a hint is used
                        blankSpan.classList.remove('correct', 'incorrect');
                        feedbackIcon.textContent = '';
                    });
                }

                // Solution Button Logic
                if (solutionButton) {
                    solutionButton.addEventListener('click', () => {
                        input.value = solution; // Fill with the correct solution
                        input.disabled = true; // Disable the input
                        blankSpan.classList.add('correct', 'solution-shown'); // Add classes for styling
                        blankSpan.classList.remove('incorrect'); // Ensure incorrect is removed
                        feedbackIcon.innerHTML = '&#10003;'; // Display checkmark
                        feedbackIcon.style.opacity = '1'; // Ensure icon is visible immediately
                        feedbackIcon.style.right = '-18px'; // Adjust position immediately
                    });
                }
            }
        });
    }

    /**
     * Checks the user's input for a listening blank.
     * @param {HTMLInputElement} inputElement The input field.
     * @param {string} solution The correct solution.
     * @param {HTMLElement} blankContainer The parent span.blank-word element.
     * @param {HTMLElement} feedbackIcon The span for the feedback icon.
     */
    function checkListeningBlank(inputElement, solution, blankContainer, feedbackIcon) {
        const userAnswer = inputElement.value.trim();

        // Clear previous feedback classes and icon content
        blankContainer.classList.remove('correct', 'incorrect', 'solution-shown');
        feedbackIcon.textContent = '';
        feedbackIcon.style.opacity = '0'; // Hide icon
        feedbackIcon.style.right = '-25px'; // Reset position

        if (userAnswer.length === 0) {
            // If the blank is empty, do nothing or reset to initial state
            return;
        }

        if (userAnswer.toLowerCase() === solution.toLowerCase()) {
            blankContainer.classList.add('correct');
            feedbackIcon.innerHTML = '&#10003;'; // Unicode checkmark
            inputElement.disabled = true; // Optionally disable input on correct answer
        } else {
            blankContainer.classList.add('incorrect');
            feedbackIcon.innerHTML = '&#10006;'; // Unicode 'X' mark
        }
        feedbackIcon.style.opacity = '1'; // Show icon with animation
        feedbackIcon.style.right = '-18px'; // Animate icon into view
    }

    function _populateDraggableWords() {
        const draggableWordsContainer = document.getElementById('draggable-words');
        if (draggableWordsContainer && _vocabularyDragWords.length > 0) {
            const words = [..._vocabularyDragWords]; // Use a copy to shuffle
            words.sort(() => Math.random() - 0.5);
            draggableWordsContainer.innerHTML = '';
            words.forEach(word => {
                const div = document.createElement('div');
                div.classList.add('draggable-word');
                div.setAttribute('draggable', 'true');
                div.setAttribute('data-word', word);
                div.textContent = word;
                draggableWordsContainer.appendChild(div);
            });
            _addDragListenersToWords();
        }

        const vocabularySentencesList = document.getElementById('vocabulary-sentences');
        if (vocabularySentencesList && _vocabularySentences.length > 0) {
            vocabularySentencesList.innerHTML = ''; // Clear existing
            _vocabularySentences.forEach((sentence, index) => {
                const li = document.createElement('li');
                // Replace placeholder like '____' with the actual drop target
                li.innerHTML = sentence.text.replace('____', `<span class="blank-drop-target" data-correct-word="${sentence.correctWord}" data-sentence-index="${index}"></span>`);
                vocabularySentencesList.appendChild(li);
            });
            _addDropListenersToBlanks();
        }
    }

    function _addDragListenersToWords() {
        document.querySelectorAll('.draggable-word').forEach(word => {
            word.addEventListener('dragstart', (e) => {
                draggedWord = e.target;
                e.dataTransfer.setData('text/plain', e.target.dataset.word);
                setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
            });
            word.addEventListener('dragend', (e) => { e.target.style.opacity = '1'; });
        });
    }

    let draggedWord = null; // Needs to be accessible within drag/drop scope

    function _addDropListenersToBlanks() {
        document.querySelectorAll('.blank-drop-target').forEach(blank => {
            blank.addEventListener('dragover', (e) => { e.preventDefault(); blank.style.borderColor = '#007bff'; });
            blank.addEventListener('dragleave', (e) => { blank.style.borderColor = '#999'; });
            blank.addEventListener('drop', (e) => {
                e.preventDefault();
                blank.style.borderColor = '#999';
                if (draggedWord) {
                    if (blank.textContent.trim() !== '') {
                        const existingWord = document.createElement('div');
                        existingWord.classList.add('draggable-word');
                        existingWord.setAttribute('draggable', 'true');
                        existingWord.setAttribute('data-word', blank.textContent);
                        existingWord.textContent = blank.textContent;
                        document.getElementById('draggable-words').appendChild(existingWord);
                        _addDragListenersToWords();
                    }
                    blank.textContent = draggedWord.dataset.word;
                    draggedWord.remove();
                    draggedWord = null;
                    blank.classList.remove('correct-answer', 'incorrect-answer');
                    document.getElementById('vocabulary-feedback').textContent = '';
                }
            });
        });
    }

    function _checkVocabularyAnswers() {
        let correctDrops = 0;
        const blankDropTargets = document.querySelectorAll('.blank-drop-target');
        const totalBlanks = blankDropTargets.length;
        blankDropTargets.forEach(blank => {
            const droppedWord = blank.textContent.trim();
            const correctWord = blank.dataset.correctWord;

            blank.classList.remove('correct-answer', 'incorrect-answer');

            if (droppedWord.toLowerCase() === correctWord.toLowerCase()) {
                blank.classList.add('correct-answer');
                correctDrops++;
            } else if (droppedWord !== '') {
                blank.classList.add('incorrect-answer');
            }
        });
        const feedbackDiv = document.getElementById('vocabulary-feedback');
        feedbackDiv.textContent = `You got ${correctDrops} out of ${totalBlanks} correct!`;
    }

    function _resetVocabulary() {
        document.querySelectorAll('.blank-drop-target').forEach(blank => {
            blank.textContent = '';
            blank.classList.remove('correct-answer', 'incorrect-answer');
        });
        document.getElementById('vocabulary-feedback').textContent = '';
        _populateDraggableWords(); // Re-populate and shuffle draggable words
    }

    function _checkComprehensionAnswers() {
        const answers = _comprehensionAnswers; // Use the private data
        let correctCount = 0;
        const feedbackDiv = document.getElementById('answer-feedback');
        feedbackDiv.innerHTML = '';

        for (const question in answers) {
            const selectedAnswer = document.querySelector(`input[name="${question}"]:checked`);
            const questionElement = document.querySelector(`input[name="${question}"]`).closest('.question');

            questionElement.querySelectorAll('label').forEach(label => {
                label.classList.remove('correct', 'incorrect');
            });

            if (selectedAnswer) {
                if (selectedAnswer.value === answers[question]) {
                    correctCount++;
                    selectedAnswer.parentElement.classList.add('correct');
                } else {
                    selectedAnswer.parentElement.classList.add('incorrect');
                }
            }
        }
        feedbackDiv.textContent = `You got ${correctCount} out of ${Object.keys(answers).length} correct!`;
    }

    function _highlightMistakes() {
        const mistakesSection = document.getElementById('mistakes');
        if (!mistakesSection) return;

        const articleParagraph = mistakesSection.querySelector('p');
        if (!articleParagraph) return;

        let currentHTML = articleParagraph.innerHTML;
        const mistakes = _mistakesToHighlight;

        mistakes.forEach(mistake => {
            // Create a regex to find the exact phrase, ensuring it's not already wrapped
            const regex = new RegExp(`(?<!<span class="highlighted">|class="highlighted">)([\\w\\s.,?!'"]*?)(${mistake.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})([\\w\\s.,?!'"]*?)(?!<\\/span>)`, 'gi');
            currentHTML = currentHTML.replace(regex, `$1<span class="highlighted">$2</span>$3`);
        });
        articleParagraph.innerHTML = currentHTML;
    }


    function _setupEventListeners() {
        // Listening section hints/solutions
        document.querySelectorAll('.hint-button').forEach(button => {
            button.addEventListener('click', () => {
                _revealHint(button.dataset.blankId, button.dataset.solution);
            });
        });
        document.querySelectorAll('.solution-button').forEach(button => {
            button.addEventListener('click', () => {
                _revealSolution(button.dataset.blankId, button.dataset.solution);
            });
        });

        // Comprehension 1 check answers
        const checkAnswersButton1 = document.querySelector('#comprehension1 .check-answers-button');
        if (checkAnswersButton1) {
            checkAnswersButton1.addEventListener('click', _checkComprehensionAnswers);
        }

        // Comprehension 2 highlight mistakes
        const highlightButton = document.querySelector('#mistakes .check-answers-button');
        if (highlightButton) {
            highlightButton.addEventListener('click', _highlightMistakes);
        }

        // Vocabulary check answers and reset
        const checkVocabButton = document.querySelector('#vocabulary .check-answers-button');
        if (checkVocabButton) {
            checkVocabButton.addEventListener('click', _checkVocabularyAnswers);
        }
        const resetVocabButton = document.querySelector('#vocabulary .solution-button'); // Assuming solution button is for reset
        if (resetVocabButton) {
            resetVocabButton.addEventListener('click', _resetVocabulary);
        }
    }


    // Public API
    return {
        init: init // This is the only function exposed globally
    };
})();
