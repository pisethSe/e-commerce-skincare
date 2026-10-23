import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Droplets, Sparkles } from "lucide-react";
import ProductCard from "../components/ui/ProductCard";
import { useCatalogStore } from "../lib/catalog";
import { TESTIMONIALS } from "../lib/data";
import { gsap, useGSAP } from "../lib/gsap";
import { useT } from "../lib/i18n";

const features = [
  { icon: "/images/Sun.svg", titleKey: "feature.cleanBeauty", descKey: "feature.cleanBeautyDesc" },
  { icon: "/images/Microscope 2.svg", titleKey: "feature.dermTested", descKey: "feature.dermTestedDesc" },
  { icon: "/images/Leaf 2.svg", titleKey: "feature.sustainable", descKey: "feature.sustainableDesc" },
] as const;

const communityShots = [
  "/images/cs3.png",
  "/images/Card 6.png",
  "/images/cs1.png",
  "/images/cs2.png",
];

export default function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { products } = useCatalogStore();
  const t = useT();

  useEffect(() => {
    document.title = "Calesta — Skincare & Beauty";
  }, []);

  useGSAP(
    () => {
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      heroTimeline
        .from(".hero-shell", { scale: 0.96, autoAlpha: 0, duration: 0.9 })
        .from(".hero-kicker", { y: 18, autoAlpha: 0, duration: 0.55 }, "-=0.45")
        .from(
          ".hero-title-line",
          { yPercent: 110, autoAlpha: 0, duration: 0.9, stagger: 0.08 },
          "-=0.25",
        )
        .from(
          ".hero-copy",
          { y: 22, autoAlpha: 0, duration: 0.55, stagger: 0.08 },
          "-=0.45",
        )
        .from(
          ".hero-hotspot",
          { scale: 0.7, autoAlpha: 0, duration: 0.5, stagger: 0.12 },
          "-=0.45",
        )
        .from(
          ".hero-product-shot",
          { y: 40, autoAlpha: 0, duration: 0.85 },
          "-=0.45",
        );

      gsap.to(".hero-float-a", {
        y: -14,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".hero-float-b", {
        y: -18,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.2,
      });

      gsap.to(".hero-float-c", {
        y: -12,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.35,
      });

      gsap.utils
        .toArray<HTMLElement>("[data-gsap-reveal]")
        .forEach((element) => {
          gsap.fromTo(
            element,
            { y: 40, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: element,
                start: "top 82%",
                once: true,
              },
            },
          );
        });

      gsap.utils
        .toArray<HTMLElement>("[data-gsap-stagger]")
        .forEach((wrapper) => {
          const children = wrapper.children;
          gsap.fromTo(
            children,
            { y: 30, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.7,
              stagger: 0.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: wrapper,
                start: "top 80%",
                once: true,
              },
            },
          );
        });
    },
    { scope: pageRef },
  );

  return (
    <div
      ref={pageRef}
      className="overflow-hidden bg-Mneutral-50 pt-[76px] text-Mneutral-900"
    >
      <section className="px-2 pt-4 pb-0 md:px-4">
        <div className="hero-shell relative mx-auto w-full max-w-[1680px] overflow-hidden rounded-[32px] bg-[#9edccd] pt-[40px] lg:pt-[80px]">
          <img
            src="/images/Shapes.png"
            className="absolute left-0 top-0 h-full w-full object-cover"
            alt=""
          />
          <div className="container-custom relative z-[1]">
            <div className="md:text-center">
              <p className="hero-kicker font-medium text__18 text-Mneutral-900 opacity-60">
                {t("home.kicker")}
              </p>
              <h1 className="mt-4 text__64 font-medium leading-[1.02]">
                <span className="hero-title-line block">{t("home.title1")}</span>
                <span className="hero-title-line block">{t("home.title2")}</span>
              </h1>

              <div className="mb-[7rem] mt-3 lg:hidden">
                <p className="hero-copy mb-[32px] text__16 text-Mneutral-700">
                  {t("home.sub")}
                </p>
                <Link to="/shop" className="hero-copy filled-pill-button">
                  <span>{t("common.shopNow")}</span>
                  <img
                    src="/images/carbon_arrow-up-right.svg"
                    alt=""
                    className="h-5 w-5"
                  />
                </Link>
              </div>
            </div>

            <div className="mt-4 -mb-4 text-center">
              <div className="relative inline-block">
                <div className="hero-hotspot hero-float-a absolute left-[25%] top-[16%] xs:left-[23%] xs:top-[21%]">
                  <div className="relative flex h-[16px] w-[16px] items-center justify-center rounded-full border border-white bg-white/15 backdrop-blur-[20px] xs:h-[24px] xs:w-[24px]">
                    <div className="h-[8px] w-[8px] rounded-full bg-white" />
                    <div className="absolute bottom-[130%] right-0 min-h-[110px] w-[103px] rounded-2xl border border-[rgba(241,243,243,0.4)] bg-white p-2 xs:min-h-[122px] xs:w-[133px] xs:p-3 md:bottom-0 md:right-[140%]">
                      <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-Mneutral-100">
                        <Droplets size={18} strokeWidth={1.8} className="text-Mneutral-900" />
                      </div>
                      <div className="mt-[12px] text-left">
                        <h5 className="text__14 font-medium">{t("home.allSkinType")}</h5>
                        <p className="mt-[2px] text-[10px] opacity-50">{t("home.skinType")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hero-hotspot hero-float-b absolute left-[56%] top-[44%] xs:left-[60%] xs:top-[46%]">
                  <div className="relative flex h-[16px] w-[16px] items-center justify-center rounded-full border border-white bg-white/15 backdrop-blur-[20px] xs:h-[24px] xs:w-[24px]">
                    <div className="h-[8px] w-[8px] rounded-full bg-white" />
                    <div className="absolute left-[125%] top-1/2 min-h-[110px] w-[103px] -translate-y-1/2 rounded-2xl border border-[rgba(241,243,243,0.4)] bg-white p-2 xs:min-h-[122px] xs:w-[133px] xs:p-3">
                      <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-Mneutral-100">
                        <Sparkles size={18} strokeWidth={1.8} className="text-Mneutral-900" />
                      </div>
                      <div className="mt-[12px] text-left">
                        <h5 className="text__14 font-medium">{t("home.smoothTexture")}</h5>
                        <p className="mt-[2px] text-[10px] opacity-50">{t("home.texture")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hero-copy absolute bottom-[20%] hidden text-left lg:block xl:-left-[42%] xl:w-[320px]">
                  <p className="mb-[40px] text__16 text-Mneutral-700">
                    {t("home.sub")}
                  </p>
                  <Link to="/shop" className="filled-pill-button">
                    <span>{t("common.shopNow")}</span>
                    <img
                      src="/images/carbon_arrow-up-right.svg"
                      alt=""
                      className="h-5 w-5"
                    />
                  </Link>
                </div>

                <div className="hero-hotspot hero-float-c absolute bottom-[10%] hidden w-[250px] rounded-3xl border border-white/30 bg-white/10 p-4 text-left backdrop-blur-[20px] lg:block xl:-right-[45%]">
                  <div className="h-[90px] w-[90px] rounded-2xl bg-white/15 backdrop-blur-[20px]">
                    <img src="/images/image 4.png" alt="" />
                  </div>
                  <Link
                    to="/products/radiance-brightening-serum"
                    className="mt-[32px] flex w-full items-end justify-between gap-[12px]"
                  >
                    <div>
                      <h5 className="mb-2 text__16 font-medium">
                        Serum · Targeted Treatment
                      </h5>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <img key={index} src="/images/Star.svg" alt="" />
                        ))}
                        <p className="text__14 opacity-50">(620)</p>
                      </div>
                    </div>
                    <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border border-Mneutral-100 bg-white">
                      <img src="/images/carbon_arrow-up-right (1).svg" alt="" />
                    </div>
                  </Link>
                </div>

                <img
                  src="/images/image 3.png"
                  alt="Calesta hero product"
                  className="hero-product-shot will-change-transform"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-[40px] text-center md:py-[180px] lg:py-[220px]"
        data-gsap-reveal
      >
        <div className="container-custom relative">
          <div className="absolute left-[16%] top-[-53%] hidden h-[120px] w-[120px] overflow-hidden rounded-2xl md:block xl:h-[161px] xl:w-[161px]">
            <video
              src="/videos/Person Holding Dropper Video.mp4"
              muted
              autoPlay
              loop
              playsInline
              className="h-full w-full object-cover object-[50%_80%]"
            />
          </div>

          <div className="absolute right-[8%] top-[-20%] hidden min-h-[110px] w-[133px] rounded-2xl border border-[rgba(241,243,243,0.4)] bg-white p-3 md:block">
            <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-Mneutral-100">
              <img src="/images/Microscope 3.svg" alt="" />
            </div>
            <div className="mt-[12px] text-left">
              <h5 className="text__14 font-medium">{t("home.provenResults")}</h5>
              <p className="mt-[2px] text-[10px] opacity-50">{t("home.committed")}</p>
            </div>
          </div>

          <p className="font-medium text__18 text-Mneutral-400">{t("home.philosophy")}</p>
          <h2 className="mt-[32px] text__48 leading-relaxed text-Mneutral-900/80">
            {t("home.philosophyBody")}
          </h2>
        </div>
      </section>

      <section className="section-template" data-gsap-reveal>
        <div className="container-custom">
          <h2 className="mb-[2.5rem] text__48">{t("home.ourProducts")}</h2>
          <div
            className="grid grid-cols-1 gap-[20px] xs:grid-cols-2 lg:grid-cols-4"
            data-gsap-stagger
          >
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-template" data-gsap-reveal>
        <div className="container-custom grid grid-cols-1 gap-[12px] md:grid-cols-2">
          <div>
            <img
              src="/images/ss2.png"
              className="h-full w-full rounded-[32px] object-cover"
              alt=""
            />
          </div>
          <div className="h-full w-full rounded-[32px] bg-white px-[20px] py-[20px] xs:px-[40px] xs:py-[40px] xl:px-[80px] xl:py-[80px]">
            <p className="mb-4 font-medium text__18 text-Mneutral-400">
              {t("home.whyChooseUs")}
            </p>
            <h2 className="text__48">{t("home.difference")}</h2>

            <div className="mt-[56px] grid grid-cols-1 gap-[24px]">
              {features.map((feature, index) => (
                <React.Fragment key={feature.titleKey}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-full border border-Mneutral-100">
                      <img src={feature.icon} alt="" />
                    </div>
                    <div>
                      <h4 className="mb-[10px] text__20">{t(feature.titleKey)}</h4>
                      <p className="text__16 text-Mneutral-600">{t(feature.descKey)}</p>
                    </div>
                  </div>
                  {index < features.length - 1 && (
                    <div className="h-px w-full bg-Mneutral-100" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pt-0 section-template" data-gsap-reveal>
        <div className="container-custom grid grid-cols-1 gap-[12px] md:grid-cols-2">
          <div className="order-2 h-full w-full rounded-[32px] bg-white px-[20px] py-[20px] xs:px-[40px] xs:py-[40px] xl:px-[80px] xl:py-[80px] md:order-1">
            <p className="mb-4 font-medium text__18 text-Mneutral-400">
              {t("home.ingredients")}
            </p>
            <h2 className="text__48">{t("home.natureTitle")}</h2>

            <div className="my-[56px] grid grid-cols-1 gap-[24px]">
              <p className="text__18">{t("home.ingredientsBody")}</p>

              <ul className="list-disc pl-4 text__18">
                <li>{t("home.noFillers")}</li>
                <li>{t("home.noChemicals")}</li>
                <li>{t("home.naturesFinest")}</li>
              </ul>
            </div>

            <Link to="/shop" className="pill-button">
              <span>{t("common.shopNow")}</span>
              <img
                src="/images/carbon_arrow-up-right (2).svg"
                alt=""
                className="h-5 w-5"
              />
            </Link>
          </div>
          <div className="order-1 md:order-2">
            <img
              src="/images/ss1.png"
              className="h-full w-full rounded-[32px] object-cover"
              alt=""
            />
          </div>
        </div>
      </section>

      <section className="section-template" data-gsap-reveal>
        <div className="container-custom">
          <h2 className="mb-[2.5rem] text-center text__48">{t("home.testimonialsTitle")}</h2>

          <div className="grid gap-[20px] lg:grid-cols-3" data-gsap-stagger>
            {TESTIMONIALS.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-[32px] bg-white p-3"
              >
                <div className="grid h-full gap-[20px] rounded-[24px] bg-white p-4 xs:grid-cols-5 xs:p-6">
                  <img
                    src={item.avatar}
                    className="hidden h-full w-full rounded-[24px] object-cover xs:col-span-2 xs:block"
                    alt={item.name}
                  />
                  <div className="xs:col-span-3">
                    <div className="flex h-full flex-wrap py-[20px]">
                      <div className="grid w-full grid-cols-1 gap-3 self-start">
                        <div className="flex items-center gap-2">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <img
                              key={index}
                              src="/images/Star (1) 2.svg"
                              alt=""
                            />
                          ))}
                        </div>
                        <h4 className="text__24">{item.product}</h4>
                        <p className="text__18">{item.text}</p>
                      </div>
                      <p className="self-end text__16 font-medium">
                        — {item.name},{" "}
                        <span className="text-Mneutral-400">{item.handle}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pt-4 pb-0" data-gsap-reveal>
        <div className="container-custom">
          <div className="relative w-full overflow-hidden rounded-[32px] bg-[#ddde92] xl:pt-[80px]">
            <img
              src="/images/Shapes 2.png"
              className="absolute left-0 top-0 h-full w-full object-cover"
              alt=""
            />
            <div className="relative z-[1] px-[1rem] py-[50px] text-center xx:px-[2rem] xs:px-0 xs:py-[80px] lg:py-[160px]">
              <div className="mb-[32px] grid grid-cols-1 gap-[12px] ss:mb-[56px]">
                <p className="font-medium text__18">{t("home.getStarted")}</p>
                <h3 className="text__56">{t("home.communityTitle")}</h3>
                <p className="text__18">{t("home.communityBody")}</p>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex w-full items-center gap-2 rounded-full bg-white p-[4px] pl-4 xs:w-[390px]">
                  <input
                    type="text"
                    placeholder={t("home.enterEmail")}
                    className="w-full border-none bg-transparent text__16 text-Mneutral-900 placeholder:text-Mneutral-500 outline-none"
                  />
                  <button
                    type="button"
                    className="rounded-full bg-Mneutral-900 px-[20px] py-[14px] font-medium text__18 text-white"
                  >
                    {t("home.subscribe")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-template" data-gsap-reveal>
        <div className="container-custom">
          <h2 className="mb-[24px] text__48 xs:mb-[56px]">{t("home.ourCommunity")}</h2>
          <div
            className="grid grid-cols-1 gap-[20px] xs:grid-cols-2 lg:grid-cols-4"
            data-gsap-stagger
          >
            {communityShots.map((image) => (
              <div
                key={image}
                className="group relative h-[325px] w-full overflow-hidden rounded-[24px]"
              >
                <img
                  src={image}
                  className="h-full w-full object-cover"
                  alt=""
                />
                <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-center justify-center bg-white opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
                  <a
                    href="#!"
                    className="inline-flex items-center gap-2 rounded-full border border-Mneutral-900 px-[12px] py-[10px] text__14 transition-all duration-300 hover:bg-Mneutral-900 hover:text-white"
                  >
                    INSTAGRAM
                    <img
                      src="/images/carbon_arrow-up-right (2).svg"
                      alt=""
                      className="h-4 w-4"
                    />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
