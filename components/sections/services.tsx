import { Gem, PartyPopper, Lightbulb } from 'lucide-react';

const services = [
  {
    icon: Gem,
    title: 'Prestation signature',
    description:
      'Une décoration sur-mesure qui raconte votre histoire et sublime chaque instant de votre journée.\n\nInclus :\n• Rendez-vous découverte & définition de l\'univers du mariage\n• Création d\'une direction artistique personnalisée (style, couleurs, ambiance)\n• Décoration de la cérémonie (arche, allée, chaises, détails)\n• Décoration de la réception (tables, centres de table, espace mariés, signalétique)\n• Mise en scène florale & éléments décoratifs\n• Installation & désinstallation le jour J\n• Coordination décorative avec les autres prestataires\n\nIdéal pour :\nLes couples qui veulent un mariage harmonieux, élégant et sans stress.',
  },
  {
    icon: PartyPopper,
    title: 'Prestation instants précieux',
    description:
      'Transformer un repas en une expérience esthétique et mémorable.\n\nInclus :\n• Conseil express sur le thème et l\'ambiance souhaitée\n• Palette de couleurs\n• Décoration de table (linge, vaisselle, bougies, fleurs, accessoires)\n• Mise en scène de l\'espace (intérieur ou extérieur)\n• Installation avant l\'événement\n\nTypes d\'événements :\nDîner de fiançailles, anniversaire, repas de famille, EVJF/EVG chic, baby shower.\n\nAtout clé :\nUne ambiance élégante, conviviale et personnalisée, même pour de petits événements.',
  },
  {
    icon: Lightbulb,
    title: 'Coaching',
    description:
      'Un accompagnement créatif pour celles et ceux qui souhaitent faire eux-mêmes, mais bien.\n\nInclus :\n• Analyse de l\'événement et de vos besoins\n• Définition de la vision globale (style, storytelling, ambiance)\n• Travail sur les couleurs, la lumière et les volumes\n• Conseils sur la scénographie et l\'aménagement de l\'espace\n• Recommandation de fournisseurs & prestataires adaptés\n• Moodboard & plan décoratif détaillé\n• Session(s) de coaching (visio ou présentiel)\n\nIdéal pour :\nMariés créatifs, organisateurs d\'événements, particuliers ou professionnels.\n\nRésultat :\nUne décoration cohérente, impactante et fidèle à votre vision.',
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="section-padding bg-secondary/30">
      <div className="container-main">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium mb-4">
            Nos Services
          </p>
          <h2 className="section-title">
            Une expertise au service de vos événements
          </h2>
          <p className="section-subtitle mx-auto">
            Découvrez notre savoir-faire en décoration événementielle et
            laissez-nous créer l&apos;ambiance parfaite pour vos moments
            précieux.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group bg-background rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <service.icon className="w-7 h-7 text-primary" />
              </div>

              {/* Title */}
              <h3 className="font-serif text-xl font-medium text-foreground mb-3">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
