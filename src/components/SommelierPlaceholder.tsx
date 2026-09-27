import grigoryPortrait from "../assets/grigory.jpg";

export function SommelierPlaceholder() {
  return (
    <section className="sommelier" aria-labelledby="sommelier-title">
      <div className="sommelier-avatar" aria-hidden="true">
        <span>Г</span>
        <img
          src={grigoryPortrait}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      </div>
      <div>
        <p className="eyebrow">СКОРО</p>
        <h3 id="sommelier-title">Сомелье Григорий</h3>
        <p>
          Поможет подобрать вино к случаю и ответит на ваши вопросы. Мы готовим
          его к знакомству.
        </p>
      </div>
      <span className="sommelier-arrow" aria-hidden="true">
        ✦
      </span>
    </section>
  );
}
