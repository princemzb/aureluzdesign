
const services = [
  {
    icon: null,
    emoji: '💍',
    title: 'Prestation signature',
    description:
      'Bien plus qu\'une décoration, une signature visuelle complète. Nous concevons l\'ambiance de votre cérémonie et de votre réception dans les moindres détails (fleurs, mobilier, mise en scène). De la conception à la dépose le jour J, nous donnons vie à vos rêves pendant que vous profitez de vos invités.',
  },
  {
    icon: null,
    emoji: '🎂',
    title: 'Prestation instants précieux',
    description:
      'L\'art de transformer un simple repas en une expérience esthétique et mémorable. De l\'intimité d\'un dîner de fiançailles à la joie d\'une baby shower, en passant par vos anniversaires et EVJF chic, nous créons un écrin sur-mesure pour vos plus beaux souvenirs. Une ambiance élégante et conviviale, jusque dans les moindres détails.',
  },
  {
    icon: null,
    emoji: '💡',
    title: 'Coaching',
    description:
      'L\'art de faire soi-même, avec l\'œil d\'une experte. Pour les mariés créatifs et les organisateurs qui souhaitent piloter leur décoration, nous vous offrons une boussole esthétique. Ensemble, nous définissons une vision cohérente et impactante pour donner vie à votre projet, avec l\'assurance d\'un résultat professionnel.',
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
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors mx-auto">
                {service.icon ? (
                  <service.icon className="w-7 h-7 text-primary" />
                ) : (
                  <span className="text-3xl">{service.emoji}</span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-serif text-xl font-medium text-foreground mb-3 text-center">
                {service.title}
              </h3>

              {/* Description */}
              <p
                className="text-muted-foreground leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: service.description }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
