let API_BASE_URL = 'https://ayoba-yamo-quizz.zen-apps.com/api/index.php';

let currentQuestionIndex = 0;
let userId = localStorage.getItem('userId') || 1; 
let questions = [];
let currentQuestion = null;
let hasAnswered = false;
let answeredQuestions = new Set();
let userStats = null;
let tickets = []; 
localStorage.setItem("otp_verify",'false')
const preferredLang = localStorage.getItem('preferred_language') || navigator.language.split('-')[0];

const REWARDS = [
    { points: 100, name: 'Badge Bronze', icon: '🥉' },
    { points: 250, name: 'Accès Premium', icon: '⭐' },
    { points: 500, name: 'Contenu Exclusif', icon: '👑' }
];

const MAX_POINTS = REWARDS[REWARDS.length - 1].points;
let points_required=0;

let translations = {};

async function loadTranslations() {
    try {
        const response = await fetch('translations.json');
        const data = await response.json();
        const lang = preferredLang || 'en'; // Par défaut en anglais
        translations = data[lang] || data['en']; // Utiliser les traductions en anglais si la langue n'est pas disponible
        console.log('Traductions chargées pour la langue:', lang);
    } catch (error) {
        console.error('Erreur lors du chargement des traductions:', error);
        translations = {}; // Charger un objet vide en cas d'échec
    }
}


function t(key) {
    return translations[key] || key; // Retourne la traduction ou la clé par défaut si la traduction est absente
}
// Fonction pour mélanger un tableau (algorithme de Fisher-Yates)
function shuffleArray(array) {
    if(array!=null)
    {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    return null;
}

async function initializeUI() {
    console.log('Initializing UI...');
    // Attendre que le DOM soit complètement chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUIHandler);
    } else {
        initializeUIHandler();
    }
}

async function initializeUIHandler() {
    console.log('Initializing UI handler...');
    const totalPoints = document.getElementById('total-points');
    const correctAnswers = document.getElementById('correct-answers');
    const progressBar = document.getElementById('progress-bar');
    const quizLoader = document.getElementById('quiz-loader');
    const quizContent = document.getElementById('quiz-content');

    if (totalPoints) totalPoints.textContent = '0';
    if (correctAnswers) correctAnswers.textContent = '0';
    if (progressBar) progressBar.style.width = '0%';
    
    try {
        // Afficher le loader
        if (quizLoader) quizLoader.classList.remove('hidden');
        if (quizContent) quizContent.classList.add('hidden');
        
        await loadTranslations(); // Charger les traductions avant d'initialiser l'UI
   
        
        await loadRewardData();
        // Charger les questions
       // await loadQuestions();
        await loadAndDisplayStats();
        
        // Cacher le loader et afficher le contenu
        if (quizLoader) quizLoader.classList.add('hidden');
        if (quizContent) quizContent.classList.remove('hidden');
        
        // Afficher la première question
        console.log('Showing first question...65' );
        showQuestion();

    } catch (error) {
        console.error('Erreur lors du chargement des questions:', error);
        showFeedback(t('loading_error'), 'error');
    }
}

async function loadAndDisplayStats() {
    console.log('Loading user stats...');
    try {

        const userIdT =await fetchUserIdByPhone(localStorage.getItem('phone'))??1;
        console.log('userIdT:', userIdT);
        const response = await axios.get(`${API_BASE_URL}?lang=${preferredLang}&endpoint=user_stats&user_id=${userIdT}`);
        if (!response) throw new Error('Failed to load user stats');
        //const data = await response.json();
        const data = response.data;
        console.log('User stats loaded:', data);
        userStats = data;

        const totalPointsElement = document.getElementById('total-points');
       // const totalPointsElement2 = document.getElementById('total-points2');
        const correctAnswersElement = document.getElementById('correct-answers');
        updateLinearProgress( data.user.total_points_earned || 0,500);
        if (totalPointsElement) {
            totalPointsElement.textContent = data.user.total_points_earned || 0;
    //        totalPointsElement2.textContent = data.user.total_points_earned || 0;
        }
        if (correctAnswersElement) {
            correctAnswersElement.textContent = data.user.total_correct_answers || 0;
        }

        updateRewardsProgress(data.user.total_points_earned || 0);
    } catch (error) {
        console.error('Error loading user stats:', error);
        showFeedback(t('loading_stats_error'), 'error');
    }
}

async function loadQuestions(phone) {
    console.log('Loading questions...');

    let userIdT =await fetchUserIdByPhone(localStorage.getItem('phone'));
    try {
        const response = await fetch(`${API_BASE_URL}?userid=${userIdT}&lang=${preferredLang}&endpoint=questions`);
        
        if (!response.ok) throw new Error('Failed to load questions');
        const data = await response.json();
        console.log('Questions loaded:', data);
        
        // Map question_id to id
        questions = data.map(q => ({
            id: q.question_id,
            question_text: q.question_text,
            category_id: q.category_id,
            level_id: q.level_id,
            url_indice: q.url_indice,
            created_at: q.created_at
        }));
        return questions;
    } catch (error) {
        console.error('Error loading questions:', error);
        showFeedback('loading_error', 'error');
        throw error;
    }
}

async function loadAnswers(questionId) {
    try {
        const response = await axios.get(`https://ayoba-yamo-quizz.zen-apps.com/api/index.php?lang=${preferredLang}&endpoint=answers&question_id=${questionId}`);
        const answers = response.data;
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = ''; // Clear previous answers
        
        answers.forEach(answer => {
            const answerButton = document.createElement('button');
            answerButton.className = 'answer-button w-full text-left p-4';
            answerButton.id = `answer-${answer.answer_id}`; // Set unique ID using answer_id
            answerButton.innerHTML = `
                <div class="flex items-center">
                    <span class="text-lg">${answer.answer_text}</span>
                </div>
            `;
            
            // Stocker si la réponse est correcte dans un attribut data
            answerButton.dataset.correct = answer.is_correct;
            console.log('answerButton.dataset.correct:', answer.is_correct);
            
            // Ajouter l'écouteur d'événement pour appeler handleAnswer au clic
            answerButton.addEventListener('click', () => handleAnswer(answer.answer_id, answer.is_correct, answerButton));
            answersContainer.appendChild(answerButton);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des réponses:', error);
    }
}

async function loadTickets() {
    console.log('Loading tickets...');
    try {
        const response = await axios.get(`${API_BASE_URL}?lang=${preferredLang}&endpoint=get_all_tickets`);
        tickets = response.data;
        console.log('Tickets loaded:', tickets);
        return tickets;
    } catch (error) {
        console.error('Error loading tickets:', error);
        showFeedback('loading_rewards_error', 'error');
        return [];
    }
}



async function createUser(phone,usernameInput='') {
    console.log('Creating user with axios...');
    try {
        const formData = new FormData();
        formData.append('phone', phone);
        formData.append('username', usernameInput);
        const response = await axios.post(`${API_BASE_URL}?lang=${preferredLang}&endpoint=users`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.status !== 200) {
            throw new Error('Erreur lors de la création de l\'utilisateur');
        }

        const data = response.data;
        console.log('User created:', data);

        await loadQuestions(phone);
        await generateOtp(phone); 

        //showFeedback('Compte créé avec succès !', 'success');
        localStorage.setItem('phone', phone);

       // Vérification de l'état OTP et affichage du modal si nécessaire
        if (localStorage.getItem("otp_verify") === "false") {
            const otpModal = document.getElementById("otp-modal");
            if (otpModal) {
                otpModal.classList.remove("hidden");
            } else {
                console.error("Le modal avec l'id 'otp-modal' est introuvable.");
            }
        }

        let userIdT =await fetchUserIdByPhone(localStorage.getItem('phone'));
        localStorage.setItem('userId', userIdT); 
        console.log('Phone number stored in localStorage:', phone);
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        showFeedback('account_creation_error', 'error');
        throw error;
    }
}

async function showQuestion() {
    console.log('Showing question...');
    if (currentQuestionIndex < questions.length) {
        currentQuestion = questions[currentQuestionIndex];
        
        // Check if currentQuestion has a valid id
        if (!currentQuestion.id) {
            console.error('showQuestion: currentQuestion.id is missing');
            //showFeedback('Erreur: ID de la question manquant', 'error');
            return;
        }
        
        // Mise à jour de l'indicateur de progression
      //  document.getElementById('current-question').textContent = currentQuestionIndex + 1;
      //  document.getElementById('total-questions').textContent = questions.length;
        const progressBar2 = document.getElementById('progress-bar');
       
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

        
        progressBar2.style.width = `${progress}%`;
      
        console.log(progress)
        // Affichage de la question
        const questionContainer = document.getElementById('question-container');
        questionContainer.textContent = currentQuestion.question_text;
        //url_indice

        // Sélectionnez l'élément avec une classe ou un autre identifiant unique
        const linkElement = document.getElementById('urllink');

        // Définissez l'attribut href dynamiquement
        if (linkElement) {
        linkElement.href = currentQuestion.url_indice;
 
        setupPreview(currentQuestion.url_indice);
        }
        // Affichage des réponses
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = '';
        
        try {
            // Load answers for the current question
            const answers = await loadAnswers(currentQuestion.id);
            
            // Mélanger les réponses
            const shuffledAnswers = shuffleArray(answers);
            
            shuffledAnswers?.forEach(answer => {
                const answerButton = document.createElement('button');
                answerButton.className = 'answer-button w-full text-left p-4';
                answerButton.id = `answer-${answer.answer_id}`; // Set unique ID using answer_id
                answerButton.innerHTML = `
                    <div class="flex items-center">
                        <span class="text-lg">${answer.answer_text}</span>
                    </div>
                `;
                
                // Stocker si la réponse est correcte dans un attribut data
                answerButton.dataset.correct = answer.is_correct;
                console.log('answerButton.dataset.correct:', answer.is_correct);
                
                // Ajouter l'écouteur d'événement pour appeler handleAnswer au clic
               answerButton.addEventListener('click', () => handleAnswer(answer.answer_id, answer.is_correct, answerButton));
                answersContainer.appendChild(answerButton);
            });
        } catch (error) {
            console.error('Error loading answers:', error);
            showFeedback('loading_answers_error', 'error');
        }
        
        // Réinitialiser l'état
        hasAnswered = false;
        const nextButton = document.getElementById('next-question-btn');
        if (nextButton) {
            nextButton.disabled = true;
            nextButton.classList.remove('hover:scale-105');
        }
    } else {
        showQuizComplete();
    }
}

async function handleAnswer(answerId, isCorrect, button) {
   
    const userIdT =await fetchUserIdByPhone(localStorage.getItem('phone'))??1;
        console.log('userIdT:', userIdT);
    console.log('Réponse sélectionnée :', answerId, 'Correcte :', isCorrect);
    userId=userIdT;
    if (hasAnswered) return; // Éviter les doubles réponses
    hasAnswered = true;

    // Mettre à jour l'interface pour le bouton sélectionné
    const buttons = document.querySelectorAll('.answer-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected', 'animate__animated', 'animate__pulse');

    // Appeler le backend pour enregistrer la réponse
    try {
        const response = await submitAnswer(userId, currentQuestion.id, answerId);
        console.log('Réponse enregistrée par le backend :', response);

        // Traitement du feedback et des points
        processAnswerFeedback(response.is_correct, response.points_awarded);

        // Marquer les bonnes et mauvaises réponses
        buttons.forEach(btn => {
            if (btn.dataset.correct === "1") {
                btn.classList.add('correct', 'animate__animated', 'animate__bounceIn');
            } else if (btn === button && !isCorrect) {
                btn.classList.add('wrong', 'animate__animated', 'animate__shakeX');
            }
        });

        // Activer le bouton pour passer à la question suivante
        const nextButton = document.getElementById('next-question-btn');
        if (nextButton) {
            nextButton.disabled = false;
            nextButton.classList.add('animate__animated', 'animate__bounceIn');
            nextButton.addEventListener('click', () => {
                currentQuestionIndex++;
                showQuestion();
            }, { once: true });
        }
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la réponse :', error);
        showFeedback('Une erreur est survenue : ' + error.message, 'error');
    }
}



function showQuizComplete() {
    console.log('Showing quiz complete...');
    const container = document.querySelector('.lg\\:col-span-2 > div');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-12 animate__animated animate__fadeIn">
                <div class="text-6xl mb-8 animate__animated animate__bounceIn">🎉</div>
                <h2 class="text-3xl font-bold gradient-text mb-4">${t('quiz_complete')}</h2>
                <p class="text-gray-600 mb-8">${t('congratulations')}</p>
                <button onclick="location.reload()" 
                        class="bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-xl font-semibold 
                        transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
                        ${t('try_again')}
                </button>
            </div>
        `;
        
       // createConfetti();
    }
}

function createConfetti() {
    console.log('Creating confetti...');
    const confetti = document.createElement('div');
    confetti.className = 'fixed inset-0 pointer-events-none z-50';
    
    for (let i = 0; i < 100; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute w-2 h-2 rounded-full';
        particle.style.backgroundColor = ['#4F46E5', '#7C3AED', '#F59E0B'][Math.floor(Math.random() * 3)];
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = '-10px';
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        particle.style.animation = `fall ${1 + Math.random() * 2}s linear forwards`;
        confetti.appendChild(particle);
    }
    
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
}

function showFeedback(messageKey, type = 'info') {
    const message = t(messageKey); // Récupère la traduction du message
    console.log('Showing feedback:', message);
    const feedbackContainer = document.getElementById('feedback-container');
    const feedback = document.createElement('div');
    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
    
    feedbackContainer.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.transform = 'translateX(100%)';
        setTimeout(() => {
            feedbackContainer.removeChild(feedback);
        }, 300);
    }, 3000);
}


function updateScore(points) {
    console.log('Updating score by:', points);
    if (points === 0) {
        console.warn('No points to update');
        return;
    }
    const totalPoints = document.getElementById('total-points');
    const totalPoints2 = document.getElementById('total-points2');
    const currentPoints = parseInt(totalPoints.textContent);
    const newPoints =currentPoints + points; // Empêcher le score d'aller en dessous de 0
    
    // Animation du score
    let count = currentPoints;
    const duration = 1000;
    const step = points / (duration / 16);
    
    function updateCounter() {
        count += step;
        if ((step > 0 && count >= newPoints) || (step < 0 && count <= newPoints)) {
            count = newPoints;
            totalPoints.textContent = Math.round(count);
            return;
        }
        totalPoints.textContent = Math.round(count);
        requestAnimationFrame(updateCounter);
    }
    
    requestAnimationFrame(updateCounter);
    
    // Mise à jour de la barre de progression
    const progressBar = document.getElementById('progress-bar');
    const percentage = (newPoints / MAX_POINTS) * 100;
    progressBar.style.width = percentage + '%';
    
    // Mise à jour du texte de progression
    // const progressText = document.getElementById('rewards-progress-text');
    // progressText.textContent = `${newPoints}/${MAX_POINTS} points`;
    
    // Effet visuel pour les points perdus
    if (points < 0) {
        const pointsLost = document.createElement('div');
        pointsLost.className = 'points-lost animate__animated animate__fadeOutUp';
        pointsLost.textContent = points;
        document.body.appendChild(pointsLost);
        
        setTimeout(() => {
            document.body.removeChild(pointsLost);
        }, 1000);
    }
}

function updateRewardsProgress(currentPoints) {
    console.log('Updating rewards progress...  '+currentPoints);
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('rewards-progress-text')??null;
    const rewardsContainer = document.getElementById('rewards-container');
    
    if (!progressBar || !progressText || !rewardsContainer || !tickets.length) return;

    const sortedTickets = [...tickets].sort((a, b) => a.points_required - b.points_required);
    
    const currentTicket = sortedTickets.filter(t => currentPoints >= t.points_required).pop() || sortedTickets[0];
    const nextTicketIndex = sortedTickets.findIndex(t => t.id === currentTicket.id) + 1;
    const nextTicket = nextTicketIndex < sortedTickets.length ? sortedTickets[nextTicketIndex] : null;
    
    let progressPercentage;
    if (!nextTicket) {
        progressPercentage = 100;
    } else {
        const previousTicketPoints = currentTicket.points_required;
        const pointsInCurrentLevel = currentPoints - previousTicketPoints;
        const pointsNeededForNextLevel = nextTicket.points_required - previousTicketPoints;
        progressPercentage = Math.min((pointsInCurrentLevel / pointsNeededForNextLevel) * 100, 100);
    }

    progressBar.style.width = `${progressPercentage}%`;
    /*
    if (!nextTicket) {
        progressText.textContent = `Niveau Maximum Atteint! (${currentPoints} points)`;
    } else {
        const pointsNeeded = nextTicket.points_required - currentPoints;
        progressText.textContent = `${pointsNeeded} points pour ${nextTicket.name}`;
    }
*/
    rewardsContainer.innerHTML = sortedTickets.map(ticket => `
        <div class="reward-item ${currentPoints >= ticket.points_required ? 'opacity-100' : 'opacity-50'} 
                    flex items-center space-x-2 p-2 rounded-lg transition-all duration-300">
            <span class="text-2xl">${getTicketIcon(ticket.name)}</span>
            <div class="flex flex-col">
                <span class="font-semibold">${ticket.name}</span>
                <span class="text-sm text-gray-500">${ticket.points_required} pts</span>
            </div>
        </div>
    `).join('');

    progressBar.style.transition = 'width 1s ease-in-out';
}

function getTicketIcon(ticketName) {
    const icons = {
        'Bronze': '🥉',
        'Argent': '🥈',
        'Or': '🥇',
        'Platine': '💎',
        'Diamant': '💫',
    };
    return icons[ticketName] || '🎫';
}

async function loadRewards() {
    try {
        const response = await axios.get(`https://ayoba-yamo-quizz.zen-apps.com/api/index.php?lang=${preferredLang}&endpoint=get_all_tickets`);
        const rewards = response.data;
        const rewardsContainer = document.getElementById('rewards-container');

        if (!rewards || rewards.length === 0) {
            rewardsContainer.innerHTML = `<p class="text-center text-gray-500">Aucune récompense disponible.</p>`;
            return;
        }

        // Trouver le nombre de points requis pour la plus grande récompense
        const totalPoints = Math.max(...rewards.map(reward => parseInt(reward.points_required, 10)));

        rewardsContainer.innerHTML = ''; // Vider les récompenses précédentes

        // Afficher les récompenses
        rewards.forEach(reward => {
            const rewardElement = document.createElement('div');
            rewardElement.className = 'reward-item p-4 border-b flex items-start space-x-4';

            const icon = reward.icon || '🎁'; // Icône par défaut

            rewardElement.innerHTML = `
                <div class="text-3xl">${icon}</div>
                <div>
                    <h3 class="text-xl font-bold">${reward.name}</h3>
                    <p>Points Requis: ${reward.points_required}</p>
                    <p>Récompense: ${reward.reward}</p>
                    <p>Quantité: ${reward.quantity}</p>
                    <p>Date d'expiration: ${reward.expiration_date ? new Date(reward.expiration_date).toLocaleDateString(preferredLang) : 'Aucune expiration'}</p>
                </div>
            `;

            rewardsContainer.appendChild(rewardElement);
        });

        // Ajouter les marqueurs de récompense
       // addRewardMarkers(rewards, totalPoints);
    } catch (error) {
        console.error('Erreur lors du chargement des récompenses:', error);
    }
}


function getRewardIcon(rewardName) {
    const icons = {
        "Special Badge": "🏅",
        "Premium Access": "👑",
        "Exclusive Content": "⭐"
    };
    return icons[rewardName] || '🎁'; // Icône par défaut si le nom de la récompense ne correspond pas
}


async function submitAnswer(userId, questionId, answerId) {
    const API_BASE_URL = 'https://ayoba-yamo-quizz.zen-apps.com/api/index.php';
    const endpoint = `${API_BASE_URL}?endpoint=submit_answer`;

    try {
        // Préparation des données avec FormData
        const formData = new FormData();
        formData.append('user_id', userId);       // Identifiant de l'utilisateur
        formData.append('question_id', questionId); // Identifiant de la question
        formData.append('answer_id', answerId);     // Identifiant de la réponse choisie

        // Envoi de la requête POST au backend avec Axios
        const response = await axios.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data', // Indiquer que les données sont au format FormData
            },
        });

        console.log('Réponse du serveur pour submitAnswer:', response.data);

        return response.data; // Renvoie les données pour traitement dans `handleAnswer`
    } catch (error) {
        // Gestion des erreurs avec Axios
        if (error.response) {
            // Erreur côté serveur (status HTTP non-200)
            console.error('Erreur côté serveur:', error.response.data);
            throw new Error(error.response.data.error || 'Erreur lors de l\'enregistrement de la réponse');
        } else if (error.request) {
            // Aucune réponse reçue du serveur
            console.error('Aucune réponse reçue du serveur:', error.request);
            throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
            // Autre type d'erreur
            console.error('Erreur inconnue:', error.message);
            throw new Error('Une erreur inconnue est survenue : ' + error.message);
        }
    }
}

function updateLinearProgress(currentPoints, totalPoints) {
    const progressBar = document.getElementById('progress-bar');
    const percentage = (currentPoints / totalPoints) * 100;
    console.log('Updating linear progress... percentage:', percentage);
    progressBar.style.width = `${percentage}%`;
   // document.getElementById('rewards-progress-text').textContent = `${currentPoints}`;
}

function processAnswerFeedback(isCorrect, pointsAwarded) {
    if (isCorrect) {
        // Feedback pour une bonne réponse
        showFeedback(t('correct_answer_feedback').replace('{points}', pointsAwarded), 'success');
      //  createConfetti();
        updateScore(pointsAwarded);

        // Mise à jour du compteur de bonnes réponses
        const correctAnswers = document.getElementById('correct-answers');
        correctAnswers.textContent = parseInt(correctAnswers.textContent) + 1;
    } else {
        // Feedback pour une mauvaise réponse
        showFeedback(t('wrong_answer_feedback').replace('{points}', pointsAwarded), 'error');
        updateScore(-pointsAwarded); // Réduire 1 point pour une mauvaise réponse
    }
}
async function loadRewardData() {
    try {
        // Charger les données depuis l'API
        const response = await axios.get('https://ayoba-yamo-quizz.zen-apps.com/api/index.php?lang=fr&endpoint=get_all_tickets');
        const reward = response.data[0]; // Supposons qu'on prend la première récompense

        const totalQuantity = 100; // Total fixe pour l'exemple
        const currentQuantity = parseInt(reward.quantity, 10); // Quantité actuelle
        const name = reward.name; // Nom de la récompense
        points_required=parseInt(reward.points_required, 10); 
        // Calcul de la progression en pourcentage
        const percentage = (currentQuantity / totalQuantity) * 100;
        document.getElementById('points_required').textContent = `${points_required}`;
   

        // Mise à jour du cercle
        const progressCircle = document.getElementById('reward-progress-circle');
      
        progressCircle.style.width = `${percentage}%`;

        // Mise à jour des textes
        document.getElementById('reward-name').textContent = name;
        document.getElementById('reward-quantity').textContent = `${currentQuantity}`;

        // document.getElementById('reward-quantity').textContent = `${currentQuantity} / ${totalQuantity}`;
    } catch (error) {
        console.error('Erreur lors du chargement des données de récompense:', error);
    }
}

// Appeler la fonction pour charger et afficher les données
loadRewardData();

// Fonction pour obtenir les paramètres de l'URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return Object.fromEntries(params.entries());
}

function getLastQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    const values = urlParams.getAll(param); // Récupère toutes les valeurs du paramètre
    return values[values.length - 1]; // Retourne la dernière valeur
}






// Fonction pour afficher le modal si le numéro de téléphone n'est pas dans le localStorage
function checkPhoneInLocalStorage() {
    const phone = localStorage.getItem('phone');
    if (!phone) {
        const phoneModal = document.getElementById('phoneModal');
        phoneModal.classList.add('active');
    }
}

// Événement pour enregistrer le numéro de téléphone
function setupPhoneModal() {
    const savePhoneBtn = document.getElementById('savePhoneBtn');
    savePhoneBtn.addEventListener('click', () => {
        const phoneInput = document.getElementById('phoneInput').value;
        const usernameInput = document.getElementById('usernameInput').value;
        if (phoneInput) {
            createUser(phoneInput,usernameInput).then(data => {
               // userId = data.user_id;
                //localStorage.setItem('userId',userId)
               // console.log('User ID:', userId);
            });
            localStorage.setItem('phone', phoneInput);
            document.getElementById('phoneModal').classList.remove('active');
            console.log('Phone number saved:', phoneInput);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded...');
    // Vérifier et stocker le paramètre 'phone' dans le localStorage
    (function storePhoneParam() {
        const queryParams = getQueryParams();
        var phoneG=getLastQueryParam('phone')
        var jid=getLastQueryParam('jid');
        if (phoneG!=null && phoneG!='null') {
            localStorage.setItem('phone', phoneG);
            document.getElementById('numeroP').textContent='Hello, '+ phoneG;
            console.log('Phone number stored in localStorage:', phoneG);
            createUser(phoneG).then(data => { });
        }
        // else if(jid!=null)
        // {
            
        //     localStorage.setItem('phone', jid);
        //     //document.getElementById('numeroP').textContent='Hello, '+ jid;
        //     console.log('jid number stored in localStorage:', jid);
        //    createUser(jid).then(data => { });
        // }
        
    })();


    //loadRewards();
  
    checkPhoneInLocalStorage();
    setupPhoneModal();
    
    retrieveAndStoreUserId();
    initializeUI();
    userId = localStorage.getItem('userId') || 1; 
});

async function fetchUserIdByPhone(phone) {
    if (phone==null) return null;
    console.log('Fetching user by phone...');
    try {
        let urlF=`${API_BASE_URL}?lang=${preferredLang}&endpoint=users&phone=${phone}`
        const response = await fetch(urlF);
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération de l\'utilisateur');
        }
        const data = await response.json();
        console.log('User fetched:', data);
        return data.user_id;
    } catch (error) {
        console.error('Erreur:', error);
        showFeedback('user_fetch_error', 'error');
        throw error;
    }
}

async function retrieveAndStoreUserId() {
    const phone = localStorage.getItem('phone');
    if (phone) {
        try {
            const userId = await fetchUserIdByPhone(phone);
            if (userId) {
                localStorage.setItem('userId', userId);
                console.log('User ID stored in localStorage:', userId);
            }
        } catch (error) {
            console.error('Failed to fetch and store user ID:', error);
        }
    }
}

function createMediaModal_old(mediaUrl) {
    // Vérifier si un modal existe déjà et le supprimer
    const existingModal = document.getElementById('mediaModal');
    if (existingModal) {
      existingModal.remove();
    }
  
    // Identifier le type de média automatiquement
    let mediaType;
    if (mediaUrl.match(/\.(jpeg|jpg|png|gif|bmp|webp)$/i)) {
      mediaType = 'image';
    } else if (mediaUrl.match(/\.(mp4|webm|ogg|avi|mov|mkv)$/i)) {
      mediaType = 'video';
    } else {
      mediaType = 'url';
    }
  
    // Créer les éléments principaux du modal
    const modal = document.createElement('div');
    modal.id = 'mediaModal';
    modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50';
  
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg shadow-lg overflow-hidden max-w-3xl w-full relative';
  
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-4 right-4 text-gray-700 bg-gray-200 rounded-full p-2 hover:bg-gray-300';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      modal.remove();
    });
  
    // Ajouter le contenu en fonction du type de média
    if (mediaType === 'image') {
      const img = document.createElement('img');
      img.src = mediaUrl;
      img.alt = 'Image';
      img.className = 'w-full h-auto';
      modalContent.appendChild(img);
    } else if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = mediaUrl;
      video.controls = true;
      video.className = 'w-full h-auto';
      modalContent.appendChild(video);
    } else if (mediaType === 'url') {
      const iframe = document.createElement('iframe');
      iframe.src = mediaUrl;
      iframe.className = 'w-full h-[80vh]';
      iframe.style.border = 'none';
      modalContent.appendChild(iframe);
    } else {
      console.error('Type de média non supporté.');
      return;
    }
  
    // Ajouter le bouton de fermeture et le contenu au modal
    modal.appendChild(closeButton);
    modal.appendChild(modalContent);
  
    // Ajouter le modal au DOM
    document.body.appendChild(modal);
  }
  
  function createMediaModal(mediaUrl) {
    // Vérifier si un modal existe déjà et le supprimer
    const existingModal = document.getElementById('mediaModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Identifier le type de média automatiquement
    let mediaType;
    if (mediaUrl.match(/\.(jpeg|jpg|png|gif|bmp|webp)$/i)) {
      mediaType = 'image';
    } else if (mediaUrl.match(/\.(mp4|webm|ogg|avi|mov|mkv)$/i)) {
      mediaType = 'video';
    } else if (mediaUrl.includes('youtube.com/watch')) {
      mediaType = 'youtube';
    } else {
      mediaType = 'url';
    }

    // Créer les éléments principaux du modal
    const modal = document.createElement('div');
    modal.id = 'mediaModal';
    modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50';

    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg shadow-lg overflow-hidden max-w-3xl w-full relative';

    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-4 right-4 text-gray-700 bg-gray-200 rounded-full p-2 hover:bg-gray-300';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      modal.remove();
    });

    // Ajouter le contenu en fonction du type de média
    if (mediaType === 'image') {
      const img = document.createElement('img');
      img.src = mediaUrl;
      img.alt = 'Image';
      img.className = 'w-full h-auto';
      modalContent.appendChild(img);
    } else if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = mediaUrl;
      video.controls = true;
      video.className = 'w-full h-auto';
      modalContent.appendChild(video);
    } else if (mediaType === 'youtube') {
      const videoId = new URL(mediaUrl).searchParams.get('v');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.className = 'w-full h-[80vh]';
      iframe.style.border = 'none';
      modalContent.appendChild(iframe);
    } else if (mediaType === 'url') {
      const iframe = document.createElement('iframe');
      iframe.src = mediaUrl;
      iframe.className = 'w-full h-[80vh]';
      iframe.style.border = 'none';
      modalContent.appendChild(iframe);
    } else {
      console.error('Type de média non supporté.');
      return;
    }

    // Ajouter le bouton de fermeture et le contenu au modal
    modal.appendChild(closeButton);
    modal.appendChild(modalContent);

    // Ajouter le modal au DOM
    document.body.appendChild(modal);
}


  // Ajout d'un gestionnaire pour les balises <a> avec id "urllink"
  document.getElementById('urllink').addEventListener('click', function(event) {
    event.preventDefault(); // Empêche la navigation par défaut
    const mediaUrl = this.href; // Récupère le lien contenu dans l'attribut href
    // Utilisation de la fonction
    
    createMediaModal(mediaUrl); // Appelle la fonction avec le lien récupéré
  });

  function createMediaModal(mediaUrl) {
    // Vérifier si un modal existe déjà et le supprimer
    const existingModal = document.getElementById('mediaModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Identifier le type de média automatiquement
    let mediaType;
    if (mediaUrl.match(/\.(jpeg|jpg|png|gif|bmp|webp)$/i)) {
      mediaType = 'image';
    } else if (mediaUrl.match(/\.(mp4|webm|ogg|avi|mov|mkv)$/i)) {
      mediaType = 'video';
    } else if (mediaUrl.includes('youtube.com/watch')) {
      mediaType = 'youtube';
    } else {
      mediaType = 'url';
    }

    // Créer les éléments principaux du modal
    const modal = document.createElement('div');
    modal.id = 'mediaModal';
    modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50';

    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg shadow-lg overflow-hidden max-w-3xl w-full relative';

    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-4 right-4 text-gray-700 bg-gray-200 rounded-full p-2 hover:bg-gray-300';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      modal.remove();
    });

    // Ajouter le contenu en fonction du type de média
    if (mediaType === 'image') {
      const img = document.createElement('img');
      img.src = mediaUrl;
      img.alt = 'Image';
      img.className = 'w-full h-auto';
      modalContent.appendChild(img);
    } else if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = mediaUrl;
      video.controls = true;
      video.className = 'w-full h-auto';
      modalContent.appendChild(video);
    } else if (mediaType === 'youtube') {
      const videoId = new URL(mediaUrl).searchParams.get('v');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.className = 'w-full h-[80vh]';
      iframe.style.border = 'none';
      modalContent.appendChild(iframe);
    } else if (mediaType === 'url') {
      const iframe = document.createElement('iframe');
      iframe.src = mediaUrl;
      iframe.className = 'w-full h-[80vh]';
      iframe.style.border = 'none';
      modalContent.appendChild(iframe);
    } else {
      console.error('Type de média non supporté.');
      return;
    }

    // Ajouter le bouton de fermeture et le contenu au modal
    modal.appendChild(closeButton);
    modal.appendChild(modalContent);

    // Ajouter le modal au DOM
    document.body.appendChild(modal);
}

// Fonction pour afficher un pop-up avec des confettis
function showVictoryPopup() {
    // Crée une boîte modale
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';

    // Contenu de la boîte
    const content = document.createElement('div');
    content.style.backgroundColor = '#fff';
    content.style.padding = '20px';
    content.style.borderRadius = '8px';
    content.style.textAlign = 'center';
    content.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    content.innerHTML = `
        <h1>🎉 Félicitations ! 🎉</h1>
        <p>Vous avez gagné votre ticket !</p>
    `;

    // Ajoute une image en bas du message
    const image = document.createElement('img');
    image.src = 'win.jpg';
    image.alt = 'Victoire';
    image.style.marginTop = '20px';
    image.style.width = '100%'; // Ajuste la largeur de l'image
    image.style.maxWidth = '300px'; // Limite la taille maximale
    image.style.borderRadius = '8px';

    content.appendChild(image);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Ajoute des confettis (en utilisant une bibliothèque ou un simple effet CSS/JS)
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    modal.appendChild(canvas);

    const confettiContext = canvas.getContext('2d');
    const confettiPieces = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speedX: (Math.random() - 0.5) * 5,
        speedY: Math.random() * 3 + 2,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        size: Math.random() * 5 + 2,
    }));

    function drawConfetti() {
        confettiContext.clearRect(0, 0, canvas.width, canvas.height);
        confettiPieces.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.y > canvas.height) p.y = 0;

            confettiContext.fillStyle = p.color;
            confettiContext.beginPath();
            confettiContext.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            confettiContext.fill();
        });
        requestAnimationFrame(drawConfetti);
    }

    drawConfetti();

    // Ferme la boîte après 5 secondes
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 5000);
}

// Fonction pour appeler l'API
function callApi() {
    fetch(`https://ayoba-yamo-quizz.zen-apps.com/api/index.php?lang=fr&endpoint=set_tickets&user_id=${userId}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        console.log('Réponse de l\'API :', data);
    })
    .catch(error => {
        console.error('Erreur lors de l\'appel à l\'API :', error);
    });
}
// Déclare une variable pour suivre si l'API a été appelée
let apiCalled = false;

// Fonction pour vérifier les points
function checkPoints() {
    const totalPoints = parseInt(document.getElementById('total-points').innerText, 10);
    const pointsRequired = parseInt(document.getElementById('points_required').innerText, 10);

    if (totalPoints >= pointsRequired && !apiCalled) {
        showVictoryPopup();
        callApi(); // Appelle l'API après la victoire
        apiCalled = true; // Marque l'API comme appelée
    }
}


function setupPreview(url) {
      const previewContainer = document.getElementById("preview-container");
        if (!previewContainer) {
            console.error("La div avec l'id 'preview-container' est introuvable.");
            return;
        }

        
        
        previewContainer.style.zIndex = "1000";

        // Fonction pour vérifier si l'URL est une image
        const isImage = (url) => {
            return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
        };

        // Fonction pour vérifier si l'URL est une vidéo
        const isVideo = (url) => {
            return /\.(mp4|webm|ogg|mov)$/i.test(url);
        };


            if (isImage(url)) {
                const img = document.createElement("img");
                img.src = url;
                img.alt = "Miniature";
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                previewContainer.appendChild(img);
            } else if (isVideo(url)) {
                const video = document.createElement("video");
                video.src = url;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.style.width = "100%";
                video.style.height = "100%";
                video.style.objectFit = "cover";
                previewContainer.appendChild(video);
            } else {
                const message = document.createElement("div");
                message.textContent = "Aucun aperçu disponible";
                message.style.color = "gray";
                message.style.textAlign = "center";
                previewContainer.appendChild(message);
            }
      


}


// Fonction de vérification de l'OTP
function otpVerification() {
    const enteredOtp = document.getElementById("otp-input").value;
    const storedOtp = localStorage.getItem("otpCode");

    if (enteredOtp === storedOtp) {
        alert("OTP Verified Successfully!");
        localStorage.setItem("otp_verify", "true");
        const modal = document.getElementById("otp-modal");
        if (modal) {
            modal.remove();
        }
    } else {
        alert("Invalid OTP. Please try again.");
    }
}





// Fonction pour générer et envoyer un OTP en asynchrone
async function generateOtp(phoneNumber) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Génère un OTP à 6 chiffres
    localStorage.setItem("otpCode", otp);

    const content = `Votre Code est: ${otp}`;
    const destinationPhone = phoneNumber;

    try {
        const response = await fetch('https://allsms.zen-apps.com/api/sendsms.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                content: content,
                destinationPhone: destinationPhone,
                senderID: 'infos'
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log("OTP sent successfully:", data);
        } else {
            console.error("Failed to send OTP:", data);
        }
    } catch (error) {
        console.error("Error sending OTP:", error);
    }
}
// Fonction pour générer et envoyer un OTP
function generateOtp_fff(phoneNumber) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Génère un OTP à 6 chiffres
    localStorage.setItem("otpCode", otp);

    const content = `Your OTP code is: ${otp}`;
    const destinationPhone = phoneNumber;

    fetch('https://allsms.zen-apps.com/api/sendsms.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            content: content,
            destinationPhone: destinationPhone,
            senderID: 'MTN PROMOTE'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("OTP sent successfully:", data);
        } else {
            console.error("Failed to send OTP:", data);
        }
    })
    .catch(error => {
        console.error("Error sending OTP:", error);
    });
}

// Surveille les changements des points toutes les secondes
//setInterval(checkPoints, 1000);
