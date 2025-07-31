// script-movies.js

const pageManager = (function() {
    // Private variables and functions here
    let _listeningBlanks = [];
    let _comprehensionAnswers = {};
    let _mistakesToHighlight = [];
    let _vocabularyDragWords = [];
    let _vocabularySentences = []; // If you dynamically create sentences too
    // let _displayNavigationButtons = true;

    const revealedLetters = {}; // Stays private to this module instance

    // Private helper functions
    function _revealHint(blankId, solution) {
        const blankSpan = document.getElementById(blankId);
        if (!blankSpan) return;

        const input = blankSpan.querySelector('input[type="text"]');
        if (!input || input.disabled) return;

        if (!revealedLetters[blankId]) {
            revealedLetters[blankId] = 0;
        }

        if (revealedLetters[blankId] < solution.length) {
            revealedLetters[blankId]++;
            input.value = solution.substring(0, revealedLetters[blankId]);
        }
        // No feedback icon to remove here
        blankSpan.classList.remove('correct', 'incorrect'); // Remove incorrect styling if hint is used
        const clipContainer = blankSpan.closest('.listening-clip');
        const feedbackBox = clipContainer ? clipContainer.querySelector('.feedback-box') : null;
        if (feedbackBox) {
            feedbackBox.innerHTML = '';
            // 🐛 FIX: Ensure feedback box is hidden consistently with opacity/visibility 🐛
            feedbackBox.style.opacity = '0';
            feedbackBox.style.visibility = 'hidden';
        }
    }

    function _revealSolution(blankId, solution) {
        const blankSpan = document.getElementById(blankId);
        if (!blankSpan) return;

        const input = blankSpan.querySelector('input[type="text"]');
        if (input) {
            input.value = solution; // Fill with the correct solution
            input.disabled = true; // Disable the input
            blankSpan.classList.add('correct', 'solution-shown'); // Add classes for styling
            blankSpan.classList.remove('incorrect'); // Ensure incorrect is removed

            const clipContainer = blankSpan.closest('.listening-clip');
            const feedbackBox = clipContainer ? clipContainer.querySelector('.feedback-box') : null;
            const explanation = blankSpan.dataset.explanation || '';

            if (feedbackBox) {
                feedbackBox.innerHTML = `
                    <span class="feedback-box-icon">✓</span>
                    <span class="feedback-box-text">${explanation}</span>
                `;
                // 🔄 MODIFIED: Control visibility and opacity for fade-in 🔄
                feedbackBox.style.visibility = 'visible';
                feedbackBox.style.opacity = '1';
            }
        }
    }

    // New function to adjust input box width
    function _adjustInputWidth(inputElement, solution) {
        // Create a temporary span to measure the text width
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        // Apply the same font styles as the input for accurate measurement
        tempSpan.style.fontFamily = getComputedStyle(inputElement).fontFamily;
        tempSpan.style.fontSize = getComputedStyle(inputElement).fontSize;
        tempSpan.textContent = solution;
        document.body.appendChild(tempSpan);

        // Add a little extra width for padding/cursor, e.g., 10 pixels
        const desiredWidth = tempSpan.offsetWidth;
        inputElement.style.width = `${desiredWidth}px`;

        document.body.removeChild(tempSpan);
    }

    // Public functions (exposed through the return object)
    function init(data) {
        // Assign the passed data to private variables
        _listeningBlanks = data.listeningBlanks || [];
        _comprehensionAnswers = data.comprehensionAnswers || {};
        _mistakesToHighlight = data.mistakesToHighlight || {};
        _vocabularyDragWords = data.vocabularyDragWords || [];
        _vocabularySentences = data.vocabularySentences || [];
        // Change data.displayNavigationButtons in the line below to make section buttons appear/disappear.
        _displayNavigationButtons = data.displayNavigationButtons !== undefined ? data.displayNavigationButtons : true;

        // Load common elements (header, footer)
        _loadPartial('header-placeholder', 'header.html');
        _loadPartial('footer-placeholder', 'footer.html');

        const navButtonsSection = document.getElementById('nav-buttons-section');
        if (navButtonsSection) {
            if (_displayNavigationButtons) {
                navButtonsSection.classList.remove('hidden-by-default');
                navButtonsSection.style.display = 'flex'; // Ensure it's displayed as flex
            } else {
                navButtonsSection.classList.add('hidden-by-default');
                navButtonsSection.style.display = 'none'; // Ensure it's hidden
            }
        }

        // Setup page-specific elements using the loaded data
        _populateDraggableWords(); // Ensure this is called with _vocabularyDragWords
        _setupEventListeners(); // Attach event listeners once
        setupListeningBlanks(); // Setup interactive blanks
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

    // --- JavaScript for Interactive Listening Blanks ---

    function setupListeningBlanks() {
        const listeningClips = document.querySelectorAll('.listening-clip');

        listeningClips.forEach(clipContainer => {
            const blankSpan = clipContainer.querySelector('.blank-word');

            if (blankSpan) {
                const blankId = blankSpan.id; // Get the ID of the blank span
                // 🆕 MODIFIED: Retrieve solution from the _listeningBlanks array 🆕
                const blankData = _listeningBlanks.find(blank => blank.id === blankId);
                if (!blankData) {
                    console.warn(`No data found for blank ID: ${blankId}`);
                    return; // Skip if no data is found
                }
                const solution = blankData.solution.trim(); // Get the solution from the variable
                const explanation = blankData.explanation || ''; // Also get explanation from variable


                // If there's existing placeholder text like '_______', clear it
                if (blankSpan.textContent.includes('_______')) {
                    blankSpan.textContent = '';
                }

                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = '_______'; // Placeholder for the input field

                blankSpan.appendChild(input);

                // Attach explanation to the blankSpan's dataset if it wasn't there already
                // This makes it available consistently to checkListeningBlank
                blankSpan.dataset.explanation = explanation;

                // Call the new function to adjust input width
                _adjustInputWidth(input, solution);

                // Add event listener to check answer when user leaves the input field
                input.addEventListener('blur', () => {
                    checkListeningBlank(input, solution, blankSpan);
                });

                // Add event listener for "Enter" key to check answer
                input.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault(); // Prevent default form submission behavior
                        checkListeningBlank(input, solution, blankSpan);
                        input.blur(); // Remove focus after checking
                    }
                });

                // Hint Button Logic
                const hintButton = clipContainer.querySelector('.hint-button');
                if (hintButton) {
                    hintButton.addEventListener('click', () => {
                        _revealHint(blankSpan.id, solution);
                    });
                }

                // Solution Button Logic
                const solutionButton = clipContainer.querySelector('.solution-button');
                if (solutionButton) {
                    solutionButton.addEventListener('click', () => {
                        _revealSolution(blankSpan.id, solution);
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
     */
    function checkListeningBlank(inputElement, solution, blankContainer) {
        const userAnswer = inputElement.value.trim();
        const clipContainer = inputElement.closest('.listening-clip');
        const feedbackBox = clipContainer ? clipContainer.querySelector('.feedback-box') : null;
        const explanation = blankContainer.dataset.explanation || ''; // Get explanation

        // Clear previous feedback classes
        blankContainer.classList.remove('correct', 'incorrect', 'solution-shown');

        if (feedbackBox) {
            feedbackBox.innerHTML = ''; // Clear previous content
            // 🔄 MODIFIED: Control visibility and opacity for fade-out 🔄
            feedbackBox.style.opacity = '0';
            feedbackBox.style.visibility = 'hidden';
        }

        if (userAnswer.length === 0) {
            // If the blank is empty, do nothing or reset to initial state
            return;
        }

        if (userAnswer.toLowerCase() === solution.toLowerCase()) {
            blankContainer.classList.add('correct');
            inputElement.disabled = true; // Disable input on correct answer

            if (feedbackBox) {
                feedbackBox.innerHTML = `
                    <span class="feedback-box-icon">✓</span>
                    <span class="feedback-box-text">${explanation}</span>
                `;
                // 🔄 MODIFIED: Control visibility and opacity for fade-in 🔄
                feedbackBox.style.visibility = 'visible';
                feedbackBox.style.opacity = '1';
            }
        } else {
            blankContainer.classList.add('incorrect');
            // Feedback box is only shown for correct answers as per previous request
        }
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

        const articleParagraph = document.getElementById("mistakes-text-content");
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
        const resetVocabButton = document.querySelector('#vocabulary .reset-button'); // Assuming solution button is for reset
        if (resetVocabButton) {
            resetVocabButton.addEventListener('click', _resetVocabulary);
        }
    }

    // Public API
    return {
        init: init // This is the only function exposed globally
    };
})();
