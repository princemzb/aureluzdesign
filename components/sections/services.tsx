import { getActiveServices } from '@/lib/actions/services.actions';

export async function ServicesSection() {
  const services = await getActiveServices();

  // Fallback to default services if database is empty
  const displayServices = services.length > 0 ? services : [
    {
      id: '1',
      emoji: '💍',
      title: 'Mariage',
      description:
        'Bien plus qu\'une décoration, une signature visuelle complète. Nous concevons l\'ambiance de votre cérémonie et de votre réception dans les moindres détails.',
      display_order: 1,
      is_active: true,
      created_at: '',
      updated_at: '',
    },
  ];

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
        <div
          className={`grid grid-cols-1 gap-8 ${
            displayServices.length === 1
              ? 'max-w-md mx-auto'
              : displayServices.length === 2
              ? 'md:grid-cols-2 max-w-3xl mx-auto'
              : 'md:grid-cols-3'
          }`}
        >
          {displayServices.map((service, index) => (
            <div
              key={service.id}
              className="group bg-background rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Emoji */}
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors mx-auto">
                <span className="text-3xl">{service.emoji}</span>
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
