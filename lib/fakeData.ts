
import { UserRole } from '../types';

export const FAKE_USERS = [
    {
        name: 'Sofia V.',
        role: UserRole.SINGLE_FEMALE,
        email: 'sofia.v@fake.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        bio: 'Eleganza e discrezione prima di tutto. Amo le conversazioni che stimolano la mente prima del corpo. Curiosa di esplorare dinamiche di potere soft.',
        desires: ['Dominazione Soft', 'Cena Elegante', 'Voyeurismo'],
        limits: ['No Singoli', 'No Foto Volto'],
        is_vip: true,
        is_verified: true,
        location: 'Milano',
        gallery: [
            'https://images.unsplash.com/photo-1502323777036-f29e3972d8db?auto=format&fit=crop&w=500',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500'
        ]
    },
    {
        name: 'Elena Dark',
        role: UserRole.SINGLE_FEMALE,
        email: 'elena.dark@fake.com',
        avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=400',
        bio: "Non cerco principi azzurri, ma re della notte. Appassionata di arte, tatuaggi e serate che finiscono all'alba. Qui per giocare duro o non giocare affatto.",
        desires: ['BDSM Soft', 'Gangbang', 'Esibizionismo'],
        limits: ['Romantico', 'No Fumatori'],
        is_vip: false,
        is_verified: true,
        location: 'Roma',
        gallery: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=500']
    },
    {
        name: 'Giulia & Marco',
        role: UserRole.COUPLE,
        email: 'giulia.marco@fake.com',
        avatar: 'https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?auto=format&fit=crop&q=80&w=400',
        bio: 'Coppia affiatata (28 e 32), cerchiamo una singola per completare la nostra armonia. Amiamo viaggiare e il buon vino. No perditempo.',
        desires: ['Threesome FFM', 'Scambio Coppie', 'Solo Drink'],
        limits: ['No Singoli Maschi', 'Igiene Massima'],
        is_vip: true,
        is_verified: true,
        location: 'Firenze',
        gallery: [
            'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=500', 
            'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=500'
        ]
    },
    {
        name: 'Beatrice',
        role: UserRole.SINGLE_FEMALE,
        email: 'bea.trice@fake.com',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400',
        bio: 'Studentessa di arte, spirito libero. Mi piace essere guardata mentre ballo. Cerco esperienze che mi facciano sentire viva.',
        desires: ['Esibizionismo', 'Party', 'Voyeurismo'],
        limits: ['No BDSM', 'Solo Location Private'],
        is_vip: false,
        is_verified: false,
        location: 'Bologna',
        gallery: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500']
    },
    {
        name: 'Valentina S.',
        role: UserRole.SINGLE_FEMALE,
        email: 'valentina.s@fake.com',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
        bio: "Timida all'apparenza, fuoco dentro. Cerco qualcuno che sappia guidarmi con mano ferma ma gentile. Sottomissione consensuale e consapevole.",
        desires: ['Dominazione Soft', 'Roleplay', 'Tantra'],
        limits: ['Dolore fisico', 'Pubblico'],
        is_vip: true,
        is_verified: true,
        location: 'Torino',
        gallery: [
            'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=500',
            'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=500'
        ]
    },
    {
        name: 'Giorgia',
        role: UserRole.SINGLE_FEMALE,
        email: 'giorgia.top@fake.com',
        avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=400',
        bio: 'Imprenditrice, dominante nella vita e... dipende. Cerco distrazioni di alto livello. Solo uomini che sanno stare al mondo.',
        desires: ['Solo Drink', 'Scambio Coppie', 'Lusso'],
        limits: ['No Alcool', 'Maleducazione'],
        is_vip: true,
        is_verified: true,
        location: 'Milano',
        gallery: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500']
    },
    {
        name: 'Martina',
        role: UserRole.SINGLE_FEMALE,
        email: 'martina.fit@fake.com',
        avatar: 'https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&q=80&w=400',
        bio: 'Energy vibes only. Amo lo sport, il mare e i corpi scolpiti. Cerco divertimento senza complicazioni sentimentali.',
        desires: ['Threesome MMF', 'Party', 'Divertimento'],
        limits: ['No fumatori', 'Drama'],
        is_vip: false,
        is_verified: false,
        location: 'Napoli',
        gallery: ['https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=500']
    },
    {
        name: 'Alessandra',
        role: UserRole.SINGLE_FEMALE,
        email: 'alessandra.lux@fake.com',
        avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400',
        bio: 'Matura, consapevole, esigente. A 40 anni so esattamente cosa voglio e come chiederlo. Ti va di scoprirlo?',
        desires: ['Tantra', 'Cena Elegante', 'Conversazione'],
        limits: ['Volgarità', 'Fretta'],
        is_vip: true,
        is_verified: true,
        location: 'Verona',
        gallery: ['https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=500']
    },
    {
        name: 'Lorenzo',
        role: UserRole.SINGLE_MALE,
        email: 'lorenzo.m@fake.com',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
        bio: 'Gentiluomo rispettoso, 35 anni. Qui per servire e compiacere le dame o le coppie che necessitano di un terzo discreto.',
        desires: ['Threesome MMF', 'Voyeurismo', 'Servizio'],
        limits: ['Dominazione', 'Irrispettosi'],
        is_vip: false,
        is_verified: true,
        location: 'Roma',
        gallery: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500']
    },
    {
        name: 'Camilla',
        role: UserRole.SINGLE_FEMALE,
        email: 'camilla.new@fake.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
        bio: "Nuova in questo mondo. Un po' spaventata ma molto curiosa. Cerco qualcuno che mi introduca a questo lifestyle con dolcezza.",
        desires: ['Solo Drink', 'Curiosità', 'Sensuale'],
        limits: ['BDSM', 'Gruppi'],
        is_vip: false,
        is_verified: false,
        location: 'Venezia',
        gallery: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500']
    }
];
